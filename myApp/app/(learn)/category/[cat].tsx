// app/(categories)/category.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  SectionList,
  Image,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

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
  title: string;
  artist: string;
  genre: string;
  newWords: string[];
  picture?: string | null;
};

type Section = { title: string; data: SongItem[] };

export default function CategoryScreen() {
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const category = useMemo(() => String(cat ?? "").trim(), [cat]);

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

  /** 2) Fetch recommendations using user fields from server (NOT JWT) */
  const fetchRecommendations = useCallback(
  async (user: UserPublic) => {
    const body = {
      user: {
        history: user.wordHistory,
        genre: user.genres,
        level: user.level,
      },
      category,
    };

    // 🟦 הדפסות דיבוג של מה שאנחנו שולחים
    console.log("[RECO/REQ] URL:", `${API_URL}/recommendations/only-new`);
    console.log("[RECO/REQ] Body:", JSON.stringify(body, null, 2));

    const res = await fetch(`${API_URL}/recommendations/only-new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // 🟦 סטטוס ו-Headers
    console.log("[RECO/RES] Status:", res.status, res.statusText);
    console.log("[RECO/RES] Headers:", Array.from(res.headers.entries()));

    // 🟦 נקרא את הטקסט גולמי כדי שנוכל להדפיס גם במקרה של JSON לא תקין
    const raw = await res.text();
    console.log("[RECO/RES] Raw body:", raw);

    if (!res.ok) {
      throw new Error(`נכשל לטעון המלצות (${res.status}): ${raw}`);
    }

    // 🟦 ננסה לפרסר JSON בצורה בטוחה
    let parsed: Record<string, SongItem[]> | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as Record<string, SongItem[]>) : {};
    } catch (e) {
      console.log("[RECO/RES] JSON parse error:", (e as Error).message);
      throw new Error("תגובה לא בפורמט JSON תקין");
    }

    // 🟦 הדפסות שימושיות להבנה האם יש תוצאות
    const genres = Object.keys(parsed || {});
    console.log("[RECO/RES] Genres keys:", genres);
    genres.forEach((g) => {
      console.log(`[RECO/RES] Genre '${g}' count:`, parsed?.[g]?.length ?? 0);
      if (Array.isArray(parsed?.[g]) && parsed![g].length) {
        console.log(`[RECO/RES] First of '${g}':`, parsed![g][0]);
      }
    });

    const nextSections: Section[] = genres.map((g) => ({
      title: g,
      data: parsed?.[g] || [],
    }));
    return nextSections.filter((s) => s.data.length > 0);
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

  /** 4) UI */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>טוען שירים לקטגוריה: {category}</Text>
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
      <Text style={styles.header}>קטגוריה: {category}</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.genre}-${item.title}-${item.artist}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.picture ? (
              <Image source={{ uri: item.picture }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverPhText}>♪</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.songTitle}>{item.title}</Text>
              <Text style={styles.songArtist}>{item.artist}</Text>
              <View style={styles.tagsWrap}>
                {item.newWords.slice(0, 8).map((w) => (
                  <View style={styles.tag} key={w}>
                    <Text style={styles.tagText}>{w}</Text>
                  </View>
                ))}
                {item.newWords.length > 8 ? (
                  <View style={[styles.tag, styles.moreTag]}>
                    <Text style={styles.moreTagText}>
                      +{item.newWords.length - 8}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, backgroundColor: "#FFF" },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: COLORS.secondary, textAlign: "right" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6, color: "#333", textAlign: "right" },
  card: { flexDirection: "row", backgroundColor: "#F7FAFB", borderRadius: 16, overflow: "hidden" },
  cover: { width: 72, height: 72, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  coverPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#E9F4F4" },
  coverPhText: { fontSize: 28, fontWeight: "700", color: COLORS.primary },
  cardBody: { flex: 1, padding: 10, alignItems: "flex-end" },
  songTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  songArtist: { fontSize: 14, color: "#555", marginTop: 2 },
  tagsWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#DFF3F3" },
  tagText: { fontSize: 12, fontWeight: "600", color: "#215E5E" },
  moreTag: { backgroundColor: COLORS.secondary },
  moreTagText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  sep: { height: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: COLORS.bgLight },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center" },
  error: { fontSize: 16, fontWeight: "700", color: "#B00020", marginBottom: 6, textAlign: "center" },
  errorSmall: { fontSize: 12, color: "#B00020", marginBottom: 12, textAlign: "center" },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryText: { color: "#003B3B", fontWeight: "800" },
});