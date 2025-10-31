// app/(categories)/category.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveLyrics, saveNewWords } from "../questions/shared/storage";
import { artistImages } from "@/assets/artistsMap";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

const categoryHebrewMap: Record<string, string> = {
  Animals: "בעלי חיים",
  Transport: "תחבורה",
  Sports: "ספורט",
  Emotions: "רגשות",
  Family: "משפחה",
  "Body Parts": "איברי גוף",
  Food: "מזון",
  Clothing: "בגדים",
};

const genreLabels: Record<string, string> = {
  rock: "רוק",
  pop: "פופ",
  rnb: "רית'ם אנד בלוז",
  hiphop: "היפ-הופ",
  metal: "מטאל",
  jazz: "ג'אז",
  folk: "פולק",
  electronic: "אלקטרוני",
  country: "קאנטרי",
  indie: "אינדי",
  kids: "ילדים",
};

type UserPublic = {
  id: string;
  username: string;
  level: number;
  genres: string[];
  picture?: string | null;
  wordHistory: string[];
  mistakes?: any[];
  favorites?: any[];
};

type SongItem = {
  id?: string | number; 
  title: string;
  artist: string;
  genre: string; 
  newWords: string[];
  lyrics?: string; 
  picture?: string | null;
};

type Section = { title: string; data: SongItem[] };


export default function CategoryScreen() {
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const category = useMemo(() => String(cat ?? "").trim(), [cat]);
  const categoryHebrew = categoryHebrewMap[category] || category;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** 1) Load user (like Settings): user_id + auth_token → GET /users/:id */
  const loadUser = useCallback(async (): Promise<UserPublic> => {
    const userId = await SecureStore.getItemAsync("user_id");
    const token = await SecureStore.getItemAsync("auth_token");

    if (!userId || !token) {
      throw new Error("לא נמצאו פרטי משתמש (user_id/auth_token).");
    }

    const res = await fetch(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("נכשל לקבל את פרטי המשתמש");

    const data = (await res.json()) as UserPublic;

    // Validate required fields
    if (
      typeof data.level !== "number" ||
      !Array.isArray(data.genres) ||
      !Array.isArray(data.wordHistory)
    ) {
      throw new Error("נתוני משתמש חסרים: level / genres / wordHistory.");
    }

    return data;
  }, []);

  /** 2) Fetch recommendations using user fields from server  */
  const fetchRecommendations = useCallback(
    async (user: UserPublic) => {
      const body = {
        user: {
          wordHistory: user.wordHistory,
          genre: user.genres,
          level: user.level,
        },
        category,
      };
      const res = await fetch(`${API_URL}/recommendations/only-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      

      // Read raw text to print in case of invalid JSON
      const raw = await res.text();

      if (!res.ok) {
        throw new Error(`נכשל לטעון המלצות (${res.status}): ${raw}`);
      }
      // safe JSON parsing
      let parsed: Record<string, SongItem[]> | null = null;
      try {
        parsed = raw ? (JSON.parse(raw) as Record<string, SongItem[]>) : {};
      } catch (e) {
        console.log("[RECO/RES] JSON parse error:", (e as Error).message);
        throw new Error("failed to parse recommendations JSON");
      }

      // Extract sections
      const genres = Object.keys(parsed || {});
      const nextSections: Section[] = genres.map((g) => ({
        title: g, // store the genre key (rock/pop/...) for later
        data: parsed?.[g] || [],
      }));

      const filtered = nextSections.filter((s) => s.data.length > 0);

      // store in cache
      try {
        await AsyncStorage.setItem("recommendations_cache", JSON.stringify(filtered));
        await AsyncStorage.setItem("user_level", String(user.level));
      } catch (err) {
        console.warn("[CACHE] failed to save recommendations:", err);
      }

      return filtered;
    },
    [category]
  );

  /** 3) Load flow */
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await loadUser();
      const s = await fetchRecommendations(user);
      setSections(s);
    } catch (e: any) {
      setSections([]);
      setError(e?.message || "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  }, [loadUser, fetchRecommendations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const user = await loadUser();
      const s = await fetchRecommendations(user);
      setSections(s);
    } catch (e: any) {
      setSections([]);
      setError(e?.message || "אירעה שגיאה");
    } finally {
      setRefreshing(false);
    }
  }, [loadUser, fetchRecommendations]);

  useEffect(() => {
    load();
  }, [load]);

  // helper to create stable slugs for songs without IDs
  const slugify = (s: string) =>
    String(s)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .slice(0, 64);

  // save newWords + lyrics, then navigate to /songs/[song]
  const handleOpenSong = useCallback(
    async (item: SongItem, genreLabel: string) => {
      const songId = item.id ? String(item.id) : slugify(`${item.title}-${item.artist}`);

      try {
        if (item.newWords?.length) {
          await saveNewWords(songId, item.newWords);
        }
        if (item.lyrics) {
          await saveLyrics(songId, item.lyrics);
        }
        // Cache basic song data for display in /songs/[song]
        await AsyncStorage.setItem(
          `@songMeta/${songId}`,
          JSON.stringify({
            title: item.title,
            artist: item.artist,
            genre: genreLabel,
            picture: item.picture ?? "",
          })
        );
      } catch (e) {
        console.warn("[song/open] failed to cache song data:", e);
      }

      router.push({ pathname: "/songs/[song]", 
        params: { song: songId,            
        title: item.title,       
        artist: item.artist,      
        picture: item.picture ?? "" } });
        },
    []
  );

  const getImageSource = (picture?: string | null) => {
    if (!picture) return null;
    // if it's a full URL, use it directly
    if (/^https?:\/\//.test(picture)) return { uri: picture };
    // otherwise, look up in the imported artistImages map
    return artistImages[picture] ?? null;
  };

  /** 4) UI */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>טוען שירים לקטגוריה: {categoryHebrew}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>⚠️ שגיאה בטעינת שירים</Text>
        <Text style={styles.errorSmall}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>נסה שוב</Text>
        </Pressable>
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>לא נמצאו שירים תואמים</Text>
        <Text style={styles.subtitle}>נסה קטגוריה אחרת או עדכן העדפות.</Text>
        <Pressable style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>רענן</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>קטגוריה: {categoryHebrew}</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {sections.map((sec) => {
          const sectionTitleHebrew = genreLabels[sec.title] || sec.title;

          return (
            <View key={sec.title} style={{ marginBottom: 18 }}>
              <Text style={styles.sectionTitle}>{sectionTitleHebrew}</Text>
              <FlatList
                horizontal
                data={sec.data}
                keyExtractor={(item, index) =>
                  item.id
                    ? String(item.id)
                    : `${slugify(item.genre)}-${slugify(item.title ?? "untitled")}-${slugify(item.artist ?? "unknown")}-${index}`
                }
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                renderItem={({ item }) => {
                  const genreLabel = genreLabels[item.genre] || item.genre;

                  return (
                    <Pressable
                      onPress={() => handleOpenSong(item, genreLabel)} 
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                      <View style={styles.vcard}>
                        {(() => {
                          const src = getImageSource(item.picture);
                          return src ? (
                            <Image source={src} style={styles.vcover} />
                          ) : (
                            <View style={[styles.vcover, styles.coverPlaceholder]}>
                              <Text style={styles.coverPhText}>♪</Text>
                            </View>
                          );
                        })()}
                        <Text numberOfLines={1} style={styles.songTitleCenter}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.songArtistCenter}>
                          {item.artist}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, backgroundColor: "#FFF" },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: COLORS.secondary, textAlign: "right" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 8, color: "#333", textAlign: "right" },

  // horizontal song card
  vcard: {
    width: 140,
    backgroundColor: "#F7FAFB",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },
  vcover: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#E9F4F4",
  },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  coverPhText: { fontSize: 28, fontWeight: "700", color: COLORS.primary },

  songTitleCenter: { fontSize: 14, fontWeight: "700", color: COLORS.secondary, textAlign: "center" },
  songArtistCenter: { fontSize: 12, color: "#555", marginTop: 2, textAlign: "center" },
  songGenreCenter: { fontSize: 11, color: "#777", marginTop: 2, textAlign: "center" },

  sep: { height: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: COLORS.bgLight },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center" },
  error: { fontSize: 16, fontWeight: "700", color: "#B00020", marginBottom: 6, textAlign: "center" },
  errorSmall: { fontSize: 12, color: "#B00020", marginBottom: 12, textAlign: "center" },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryText: { color: "#003B3B", fontWeight: "800" },
});
