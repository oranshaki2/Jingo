import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router } from "expo-router";
import { artistImages } from "@/assets/artistsMap";

// translations generated from dataset/semantics/category_in_hebrew.py
const translations: Record<
  string,
  string
> = require("../../assets/translations_he.json");

const getHebrew = (word: string) => {
  if (!word) return null;
  return translations[String(word).trim().toLowerCase()] ?? null;
};

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

const getImageSource = (picture?: string | null) => {
  if (!picture) return null;
  if (/^https?:\/\//.test(picture)) return { uri: picture };
  return artistImages[picture] ?? null;
};

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
    { id?: string; title: string; artist: string }[]
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
                id: fav._id ?? fav.id ?? undefined,
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
                console.warn(
                  "Failed to fetch favorite song",
                  id,
                  songRes.status
                );
                return null;
              }
              const song = await songRes.json();
              return {
                id,
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
          setFavorites(
            resolvedFavs.filter(Boolean) as { title: string; artist: string }[]
          );
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

  // Close any open lists when the screen gains focus (e.g. when returning)
  useFocusEffect(
    useCallback(() => {
      setOpenMistakes(false);
      setOpenLearned(false);
      setOpenFavorites(false);
      return () => {};
    }, [])
  );

  // Handle favorite press: fetch song info, store meta/lyrics, pick random category, navigate
  const handleFavoritePress = async (fav: {
    id?: string;
    title: string;
    artist: string;
  }) => {
    try {
      const id = fav.id;

      // prepare fallback meta values (used for routing & caching)
      let metaTitle = fav.title;
      let metaArtist = fav.artist ?? "";
      let picture: string | null = "";
      let lyrics: string | null = null;

      if (id) {
        const token = await SecureStore.getItemAsync("auth_token");
        const res = await fetch(`${API_URL}/songs/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const song = await res.json();
          let displayPicture: string | null = null;
          if (song.artist) {
            const artistKey = String(song.artist ?? "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '_');
            
            if (artistImages[artistKey]) {
              displayPicture = artistKey; 
            }
          }

          metaTitle = song.title ?? song.name ?? metaTitle;
          metaArtist = song.artist ?? song.performer ?? metaArtist;

          if (song.lyrics) {
            const lyricsStr =
              typeof song.lyrics === "string"
                ? song.lyrics
                : JSON.stringify(song.lyrics);
            lyrics = lyricsStr;
            await AsyncStorage.setItem(`@lyrics/${id}`, lyricsStr);
          }

          // store meta for the song page
          await AsyncStorage.setItem(
            `@songMeta/${id}`,
            JSON.stringify({
              id,
              title: metaTitle,
              artist: metaArtist,
              genre: song.genre ?? undefined,
              picture: displayPicture ?? null,
              lyrics: lyrics ?? null,
            })
          );

          // extract categories -> words mapping from the API response
          const extractCategoryMap = (
            s: any
          ): Record<string, string[]> | null => {
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
              if (
                Array.isArray(s.categories) &&
                s.categories.length === cw.length
              ) {
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
              if (
                first &&
                typeof first === "object" &&
                Array.isArray(first.words)
              ) {
                const map: Record<string, string[]> = {};
                for (const cat of s.categories) {
                  if (cat && cat.name)
                    map[cat.name] = Array.isArray(cat.words) ? cat.words : [];
                }
                return map;
              }
            }

            if (
              Array.isArray(s.categories) &&
              s.words &&
              typeof s.words === "object"
            ) {
              return s.words;
            }

            return null;
          };

          const catMap = extractCategoryMap(song);
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
                  `@newWords/${id}`,
                  JSON.stringify(picked)
                );
            }
          }

          // Navigate with explicit picture param
          router.push({
            pathname: "/songs/[song]",
            params: {
              song: id,
              title: metaTitle,
              artist: metaArtist,
              picture: displayPicture ?? "", // pass explicitly (empty string if null)
              lyrics: lyrics ?? null,
            },
          });
          return;
        }
      }

      // fallback: if no id or fetch failed
      const encoded = encodeURIComponent(fav.title.trim());
      
      // Create artist key from favorite artist (spaces → underscores)
      let fallbackPicture = "";
      if (fav.artist) {
        const artistKey = String(fav.artist)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_');
        
        if (artistImages[artistKey]) {
          fallbackPicture = artistKey;
        }
      }
      
      await AsyncStorage.setItem(
        `@songMeta/${encoded}`,
        JSON.stringify({
          id: encoded,
          title: fav.title,
          artist: fav.artist ?? "",
          picture: fallbackPicture,
          lyrics: null,
        })
      );
      router.push({
        pathname: "/songs/[song]",
        params: {
          song: encoded,
          title: fav.title,
          artist: fav.artist ?? "",
          picture: fallbackPicture,
          lyrics: null,
        },
      });
    } catch (e) {
      console.warn("Favorite navigation failed:", e);
      Alert.alert("שגיאה", "לא ניתן לפתוח את השיר כרגע.");
    }
  };

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
                      {getHebrew(w) ? (
                        <Text style={styles.translationText}>
                          {"\n" + getHebrew(w)}
                        </Text>
                      ) : null}
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
                      {getHebrew(w) ? (
                        <Text style={styles.translationText}>
                          {"\n" + getHebrew(w)}
                        </Text>
                      ) : null}
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
              היסטוריית שירים
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
                    <Pressable
                      key={`${s.title}-${i}`}
                      onPress={() => handleFavoritePress(s)}
                      style={({ pressed }) => [
                        styles.favoriteRow,
                        openFavorites && styles.favoriteRowActive,
                        pressed && styles.pressed,
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
                    </Pressable>
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

  accordionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  accordionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
  },
  accordionHeaderActive: {
    backgroundColor: COLORS.primary,
  },
  pressed: { opacity: 0.9 },

  accordionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
  },
  accordionTitleActive: {
    color: "#003B3B",
  },

  accordionToggle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginLeft: 8,
  },
  accordionToggleActive: {
    color: "#003B3B",
  },

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
    fontWeight: "700",
  },
  diffLine: {
    backgroundColor: "#E6EEF0",
    borderBottomColor: "#E6EEF0",
  },
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
  translationText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
});