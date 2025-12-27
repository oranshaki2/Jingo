import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { artistImages } from "@/assets/artistsMap";

type SuggestedSong = {
  _id?: string;
  id?: string;
  title?: string; // some payloads might use title
  name?: string; // server songs use name
  artist?: string;
  genre?: string;
  picture?: string;
  categories?: any;
  category_words?: any;
  categoryWords?: any;
  category_map?: any;
  categories_map?: any;
  words?: any;
  lyrics?: any;
};

const getImageSource = (picture?: string | null) => {
  if (!picture) return null;
  if (/^https?:\/\//.test(picture)) return { uri: picture };
  return artistImages[picture] ?? null;
};

 

export default function SongsSuggestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{
    userId?: string;
    songId?: string;
  }>;

  const [suggestions, setSuggestions] = useState<SuggestedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        setError("API_URL not configured");
        setLoading(false);
        return;
      }

      // userId for header, songId for path
      let userId = params.userId;
      if (!userId) {
        try {
          userId = (await SecureStore.getItemAsync("user_id")) || undefined;
        } catch (e) {
          console.warn("[suggestions] failed to read user_id", e);
        }
      }

      const songId = params.songId;

      if (!userId) {
        setError("No user id available");
        setLoading(false);
        return;
      }

      if (!songId) {
        setError("No song id provided for suggestions");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_URL}/songs/${songId}/favorite-suggestions`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": userId,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const ids: string[] | null = Array.isArray(data)
          ? (data as string[])
          : Array.isArray(data?.songs)
            ? (data.songs as string[])
            : null;

        if (ids && ids.length > 0) {
          // Fetch each song by ID to get full details
          const detailed = await Promise.all(
            ids.map(async (sId) => {
              try {
                const songRes = await fetch(`${API_URL}/songs/${sId}`);
                if (!songRes.ok) throw new Error();
                const songData = await songRes.json();
                return songData as SuggestedSong;
              } catch {
                return { _id: sId, id: sId } as SuggestedSong;
              }
            })
          );
          setSuggestions(detailed);
        } else if (Array.isArray(data)) {
          setSuggestions(data as SuggestedSong[]);
        } else if (Array.isArray(data?.songs)) {
          setSuggestions(data.songs as SuggestedSong[]);
        } else {
          setSuggestions([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [params.userId, params.songId]);

  const handleBackToHome = () => {
    // Navigate back to home screen
    router.push("/(tabs)/home");
  };

  const extractCategoryMap = (s: any): Record<string, string[]> | null => {
    if (!s) return null;
    const candidates = [
      s.categoryWords,
      s.wordsByCategory,
      s.words_by_category,
      s.category_map,
      s.categories_map,
    ];
    for (const c of candidates) {
      if (c && typeof c === "object" && !Array.isArray(c)) return c;
    }

    if (Array.isArray(s.category_words) && s.category_words.length) {
      const cw = s.category_words;
      let cats: string[] = [];
      if (Array.isArray(s.categories) && s.categories.length === cw.length) {
        cats = s.categories as string[];
      } else {
        for (let i = 0; i < cw.length; i++) cats.push(`cat${i + 1}`);
      }
      const map: Record<string, string[]> = {};
      for (let i = 0; i < cw.length; i++) {
        const entry = cw[i];
        if (Array.isArray(entry)) {
          const words = entry.filter(
            (w: any) => typeof w === "string" && !/^\d+$/.test(w)
          );
          map[cats[i]] = words.map((w: any) => String(w));
        } else {
          map[cats[i]] = [];
        }
      }
      return map;
    }

    if (Array.isArray(s.categories) && s.categories.length) {
      const first = s.categories[0];
      if (first && typeof first === "object" && Array.isArray(first.words)) {
        const map: Record<string, string[]> = {};
        for (const cat of s.categories) {
          if (cat && cat.name)
            map[cat.name] = Array.isArray(cat.words) ? cat.words : [];
        }
        return map;
      }
    }

    if (Array.isArray(s.categories) && s.words && typeof s.words === "object") {
      return s.words as Record<string, string[]>;
    }

    return null;
  };
  const imageSource = getImageSource();

  const handleSuggestionPress = async (song: SuggestedSong) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) return;

      const songId = song._id || song.id;
      if (!songId) return;

      // Use existing song data; if minimal, try to refetch
      let full = song;
      if (!song.title && !song.name) {
        try {
          const res = await fetch(`${API_URL}/songs/${songId}`);
          if (res.ok) full = (await res.json()) as SuggestedSong;
        } catch {}
      }

      const title = full.title || full.name || "Unknown";
      const artist = full.artist || "";
      const picture =
        full.picture || "";

      // persist meta
      await AsyncStorage.setItem(
        `@songMeta/${songId}`,
        JSON.stringify({
          id: songId,
          title,
          artist,
          genre: full.genre ?? undefined,
          picture,
        })
      );

      // lyrics if available
      if (full.lyrics) {
        const lyricsStr =
          typeof full.lyrics === "string"
            ? full.lyrics
            : JSON.stringify(full.lyrics);
        await AsyncStorage.setItem(`@lyrics/${songId}`, lyricsStr);
      }

      // choose random category words
      const catMap = extractCategoryMap(full);
      if (catMap) {
        const keys = Object.keys(catMap).filter(Boolean);
        if (keys.length > 0) {
          const chosen = keys[Math.floor(Math.random() * keys.length)];
          const allWords = Array.isArray(catMap[chosen])
            ? catMap[chosen].filter(Boolean).map((w: any) => String(w))
            : [];
          const pickCount = Math.min(8, allWords.length);
          const picked: string[] = [];
          while (picked.length < pickCount && allWords.length) {
            const idx = Math.floor(Math.random() * allWords.length);
            picked.push(allWords.splice(idx, 1)[0]);
          }
          if (picked.length)
            await AsyncStorage.setItem(
              `@newWords/${songId}`,
              JSON.stringify(picked)
            );
        }
      }

      router.push({
        pathname: "/songs/[song]",
        params: {
          song: songId,
          title,
          artist,
          picture,
        },
      });
    } catch (e) {
      console.warn("[suggestions] navigate failed", e);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerBox}>
          <Text style={styles.headerEmoji}>💡</Text>
        </View>

        <Text style={styles.title}>עוד ממה שאתם אוהבים</Text>

        <Text style={styles.message}>
          הנה כמה הצעות לשירים נוספים שכדאי לנסות:
        </Text>

        <View style={styles.suggestionsBox}>
          {loading && <ActivityIndicator size="large" color={COLORS.primary} />}

          {!loading && error && (
            <Text style={[styles.suggestionsText, { color: COLORS.error }]}>
              {error}
            </Text>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <Text style={styles.suggestionsText}>
              אין כרגע הצעות. נסו להוסיף עוד מועדפים.
            </Text>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <View style={styles.list}>
              {suggestions.map((song, idx) => (
                <Pressable
                  key={song._id || song.id || `${song.title}-${idx}`}
                  style={({ pressed }) => [
                    styles.listItem,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => handleSuggestionPress(song)}
                >
                  {song.picture ? (
                    <Image
                      source={{
                        uri:
                          song.picture || "",
                      }}
                      style={styles.songImage}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title || song.name || "ללא שם"}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {song.artist || "אמן לא ידוע"}
                    </Text>
                    {song.genre ? (
                      <Text style={styles.songGenre}>{song.genre}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable style={styles.homeButton} onPress={handleBackToHome}>
          <Text style={styles.buttonText}>חזרה לעמוד הבית</Text>
        </Pressable>
      </View>
    </View>
  );
}

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  error: "#EF4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  headerBox: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 32,
  },
  suggestionsBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  suggestionsText: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: "center",
  },
  list: {
    width: "100%",
    gap: 12,
  },
  listItem: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  songGenre: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
