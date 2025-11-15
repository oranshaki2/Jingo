import React, { useEffect, useState, useMemo } from "react";
import { Image } from "expo-image";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  PixelRatio,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// convert cm to device pixels (approx)
const cmToPx = (cm: number) => {
  const dpi = PixelRatio.get() * 160; // approximate device DPI
  return Math.round((cm / 2.54) * dpi);
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [learned, setLearned] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<
    { title: string; artist: string }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  const [openMistakes, setOpenMistakes] = useState(false);
  const [openLearned, setOpenLearned] = useState(false);
  const [openFavorites, setOpenFavorites] = useState(false);

  // compute maxHeight for lists: 10cm
  const listMaxHeight = useMemo(() => {
    return cmToPx(10);
  }, []);

  // compute lowercase lookup sets to find items present across lists
  const { learnedSet, mistakesSet, favTitleSet } = useMemo(() => {
    const l = new Set(learned.map((s) => String(s).trim().toLowerCase()));
    const m = new Set(mistakes.map((s) => String(s).trim().toLowerCase()));
    const f = new Set(
      favorites.map((fv) =>
        String(fv.title ?? "")
          .trim()
          .toLowerCase()
      )
    );
    return { learnedSet: l, mistakesSet: m, favTitleSet: f };
  }, [learned, mistakes, favorites]);

  const isLearnedDifferent = (word: string) => {
    const w = String(word).trim().toLowerCase();
    return !mistakesSet.has(w) && !favTitleSet.has(w);
  };
  const isMistakeDifferent = (word: string) => {
    const w = String(word).trim().toLowerCase();
    return !learnedSet.has(w) && !favTitleSet.has(w);
  };
  const isFavoriteDifferent = (title: string) => {
    const t = String(title).trim().toLowerCase();
    return !learnedSet.has(t) && !mistakesSet.has(t);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");

        if (!userId || !token) {
          throw new Error("לא נמצאו פרטי משתמש (user_id/auth_token).");
        }

        const res = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`שגיאת רשת: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!mounted) return;

        // apply parsers
        setMistakes(data.mistakes ?? []);
        setLearned(data.wordHistory ?? []);

        const rawFavs = Array.isArray(data.favorites) ? data.favorites : [];

        // favorites in the backend are saved as song ObjectId strings.
        // Resolve them to { title, artist } by fetching each song.
        const resolvedFavs = await Promise.all(
          rawFavs.map(async (fav: any) => {
            if (!fav) return null;
            // if already an object with title -> use it
            if (typeof fav === "object" && (fav.title || fav.name)) {
              return {
                title: fav.title ?? fav.name ?? "",
                artist: fav.artist ?? fav.performer ?? "",
              };
            }
            // otherwise assume it's an id (string/number)
            const id = String(fav);
            try {
              const songRes = await fetch(`${API_URL}/songs/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!songRes.ok) {
                console.warn("Failed to fetch favorite song", id, songRes.status);
                return null;
              }
              const song = await songRes.json();
              return {
                title: song.title ?? song.name ?? `#${id.slice(0, 6)}`,
                artist: song.artist ?? song.performer ?? "",
              };
            } catch (err) {
              console.warn("Error fetching favorite song", id, err);
              return null;
            }
          })
        );
        if (mounted)
          setFavorites(resolvedFavs.filter(Boolean) as { title: string; artist: string }[]);
      } catch (e: any) {
        console.warn("Profile fetch error:", e);
        setErr(e?.message ?? "אירעה שגיאה בטעינת פרופיל");
        Alert.alert("שגיאה", e?.message ?? "אירעה שגיאה בטעינת פרופיל");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>פרופיל</Text>
        <View style={styles.titleUnderline} />
        <Image
          source={require("../../assets/gif/Happy Bird.gif")}
          style={{ width: 100, height: 100 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Mistakes Accordion */}
        <View
          style={[styles.accordion, openMistakes && styles.accordionActive]}
        >
          <Pressable
            onPress={() => {
              setOpenMistakes((s) => !s);
              setOpenLearned(false);
              setOpenFavorites(false);
            }}
            style={({ pressed }) => [
              styles.accordionHeader,
              pressed && styles.pressed,
              openMistakes && styles.accordionHeaderActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: openMistakes }}
          >
            <Text
              style={[
                styles.accordionTitle,
                openMistakes && styles.accordionTitleActive,
              ]}
            >
              טעויות
            </Text>
            <Text
              style={[
                styles.accordionToggle,
                openMistakes && styles.accordionToggleActive,
              ]}
            >
              {openMistakes ? "▲" : "▼"}
            </Text>
          </Pressable>
          {openMistakes && (
            <View
              style={[
                styles.accordionBody,
                openMistakes && styles.accordionBodyActive,
                { maxHeight: listMaxHeight },
              ]}
            >
              <ScrollView nestedScrollEnabled>
                {mistakes.length ? (
                  mistakes.map((w, i) => (
                    <Text
                      key={`${w}-${i}`}
                      style={[
                        styles.listItem,
                        openMistakes && styles.listItemActive,
                        isMistakeDifferent(w) && styles.diffLine,
                      ]}
                    >
                      {w}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.emptyText}>אין טעויות לשלב זה.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Learned Words Accordion */}
        <View style={[styles.accordion, openLearned && styles.accordionActive]}>
          <Pressable
            onPress={() => {
              setOpenLearned((s) => !s);
              setOpenMistakes(false);
              setOpenFavorites(false);
            }}
            style={({ pressed }) => [
              styles.accordionHeader,
              pressed && styles.pressed,
              openLearned && styles.accordionHeaderActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: openLearned }}
          >
            <Text
              style={[
                styles.accordionTitle,
                openLearned && styles.accordionTitleActive,
              ]}
            >
              מילים שנלמדו
            </Text>
            <Text
              style={[
                styles.accordionToggle,
                openLearned && styles.accordionToggleActive,
              ]}
            >
              {openLearned ? "▲" : "▼"}
            </Text>
          </Pressable>
          {openLearned && (
            <View
              style={[
                styles.accordionBody,
                openLearned && styles.accordionBodyActive,
                { maxHeight: listMaxHeight },
              ]}
            >
              <ScrollView nestedScrollEnabled>
                {learned.length ? (
                  learned.map((w, i) => (
                    <Text
                      key={`${w}-${i}`}
                      style={[
                        styles.listItem,
                        openLearned && styles.listItemActive,
                        isLearnedDifferent(w) && styles.diffLine,
                      ]}
                    >
                      {w}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.emptyText}>עדיין לא נלמדו מילים.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Favorites Accordion */}
        <View
          style={[styles.accordion, openFavorites && styles.accordionActive]}
        >
          <Pressable
            onPress={() => {
              setOpenFavorites((s) => !s);
              setOpenMistakes(false);
              setOpenLearned(false);
            }}
            style={({ pressed }) => [
              styles.accordionHeader,
              pressed && styles.pressed,
              openFavorites && styles.accordionHeaderActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: openFavorites }}
          >
            <Text
              style={[
                styles.accordionTitle,
                openFavorites && styles.accordionTitleActive,
              ]}
            >
              מועדפים
            </Text>
            <Text
              style={[
                styles.accordionToggle,
                openFavorites && styles.accordionToggleActive,
              ]}
            >
              {openFavorites ? "▲" : "▼"}
            </Text>
          </Pressable>
          {openFavorites && (
            <View
              style={[
                styles.accordionBody,
                openFavorites && styles.accordionBodyActive,
                { maxHeight: listMaxHeight },
              ]}
            >
              <ScrollView nestedScrollEnabled>
                {favorites.length ? (
                  favorites.map((s, i) => (
                    <View
                      key={`${s.title}-${i}`}
                      style={[
                        styles.favoriteRow,
                        openFavorites && styles.favoriteRowActive,
                        // highlight difference when favorite title not present in words
                        isFavoriteDifferent(s.title) && styles.diffLineFavRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.songTitle,
                          openFavorites && styles.songTitleActive,
                          isFavoriteDifferent(s.title) && styles.diffLineText,
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {s.artist ? `${s.title} — ${s.artist}` : s.title}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>לא הוספת שירים למועדפים.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* small spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
    textAlign: "center",
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 10,
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },

  // Accordion
  accordion: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },

  // active wrapper (applies to the whole section when open)
  accordionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Header (button)
  accordionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 18, // increased padding for larger button
    backgroundColor: "#FFFFFF",
  },
  accordionHeaderActive: {
    backgroundColor: COLORS.primary,
  },
  pressed: { opacity: 0.9 },

  accordionTitle: {
    fontSize: 18, // larger font
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
  },
  accordionTitleActive: {
    color: "#003B3B", // darker text on primary background for readability
  },

  accordionToggle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginLeft: 8,
  },
  accordionToggleActive: {
    color: "#003B3B",
  },

  // Body
  accordionBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FAFDFF",
  },
  accordionBodyActive: {
    backgroundColor: COLORS.primary,
  },

  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ECEFF1",
    color: COLORS.textDark,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "700", // make learned/mistake words bold like favorites
  },
  // common diff line style (used for words)
  diffLine: {
    backgroundColor: "#E6EEF0",
    borderBottomColor: "#E6EEF0",
  },
  // favorite-specific row/text tweaks
  diffLineFavRow: {
    backgroundColor: "#E6EEF0",
    borderBottomColor: "#E6EEF0",
  },
  diffLineText: {
    backgroundColor: "#E6EEF0",
  },
  listItemActive: {
    color: "#003B3B",
  },
  emptyText: {
    paddingVertical: 8,
    color: "#777",
    textAlign: "center",
  },

  favoriteRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ECEFF1",
    alignItems: "center",
  },
  favoriteRowActive: {
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "center",
  },
  songTitleActive: {
    color: "#003B3B",
  },
  songArtist: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  songArtistActive: {
    color: "#073238",
  },
});
