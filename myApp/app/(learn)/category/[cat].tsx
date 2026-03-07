/**
 * @file app/(learn)/category/[cat].tsx
 * @description Dynamic category screen for the Jingo language-learning app.
 *
 * This screen is reached via the route  `/category/<cat>`  (e.g. `/category/Animals`).
 * It performs the following steps on mount:
 *   1. Reads `user_id` and `auth_token` from SecureStore and fetches the full
 *      user profile from the REST API (`GET /users/:id`).
 *   2. Posts the user's `wordHistory`, preferred `genres`, and `level` together
 *      with the chosen `category` to `POST /recommendations/only-new` to obtain
 *      a list of recommended songs grouped by genre.
 *   3. Caches both the recommendations and the user level in AsyncStorage so the
 *      data survives a forced close without requiring a network round-trip.
 *   4. Renders the recommendations as a set of horizontally-scrollable genre
 *      sections, each containing tappable song cards.
 *
 * Tapping a card caches the song's `newWords` and `lyrics` in AsyncStorage,
 * then navigates to `/songs/[song]` via Expo Router.
 *
 * All user-facing strings are displayed in Hebrew.
 */
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
import { artistImages } from "@/assets/artistsMap";

/** Shared colour palette used throughout this screen. */
const COLORS = {
  /** Teal – primary brand colour used for buttons and accents. */
  primary: "#4EC4C4",
  /** Dark navy – used for headings and high-contrast text. */
  secondary: "#1A3D5A",
  /** Off-white – default background for centred state views. */
  bgLight: "#F5F7F9",
  /** Near-black – body text colour. */
  textDark: "#333333",
  /** Mint green – secondary accent. */
  accent: "#A8E6CF",
};

/** Base URL for all Jingo REST API calls, injected at build time via Expo's
 *  public environment variable mechanism. */
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// ---------------------------------------------------------------------------
// Local AsyncStorage helpers for offline caching of song data
// ---------------------------------------------------------------------------

/**
 * Persists the full lyrics string for a song in AsyncStorage under the key
 * `@lyrics/<songId>`.  Called before navigating to the song screen so that
 * the lyrics are available even if the device goes offline.
 *
 * @param songId - Unique song identifier (MongoDB `_id` or generated slug).
 * @param lyrics - Raw lyrics text or serialised JSON.
 */
async function saveLyrics(songId: string, lyrics: string) {
  await AsyncStorage.setItem(`@lyrics/${songId}`, lyrics);
}

/**
 * Retrieves previously cached lyrics for a song from AsyncStorage.
 *
 * @param songId - Unique song identifier.
 * @returns The stored lyrics string, or an empty string if nothing was cached.
 */
async function loadLyrics(songId: string) {
  return (await AsyncStorage.getItem(`@lyrics/${songId}`)) ?? "";
}

/**
 * Serialises and persists the array of "new words" (vocabulary items) for a
 * song under the key `@newWords/<songId>`.  The song screen reads this list
 * to highlight unfamiliar words in the lyrics.
 *
 * @param songId - Unique song identifier.
 * @param words - Array of new-word objects returned by the recommendations API.
 */
async function saveNewWords(songId: string, words: unknown) {
  await AsyncStorage.setItem(`@newWords/${songId}`, JSON.stringify(words));
}

/**
 * Maps English category keys (as stored in the database and passed via the
 * route param) to their Hebrew display names shown in the UI.
 */
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

/**
 * Maps English genre keys returned by the recommendations API to their Hebrew
 * display labels rendered as section headers in the song list.
 */
const genreLabels: Record<string, string> = {
  rock: "רוק",
  pop: "פופ",
  "R&B": "רית'ם אנד בלוז",
  "Hip-Hop": "היפ-הופ",
  metal: "מטאל",
  jazz: "ג'אז",
  folk: "פולק",
  electronic: "אלקטרוני",
  country: "קאנטרי",
  indie: "אינדי",
  kids: "ילדים",
};

/**
 * Partial user profile returned by `GET /users/:id`.
 * Only the fields consumed by this screen are declared; additional server
 * fields are ignored.
 */
type UserPublic = {
  /** MongoDB ObjectId string. */
  id: string;
  /** Display name. */
  username: string;
  /** Current vocabulary level (1–5) used to filter song difficulty. */
  level: number;
  /** User's preferred music genres (e.g. ["rock", "pop"]). */
  genres: string[];
  /** Optional profile picture identifier or URL. */
  picture?: string | null;
  /** Array of word IDs the user has already encountered. Used by the
   *  recommendations engine to avoid re-showing known vocabulary. */
  wordHistory: string[];
  /** History of incorrectly-answered words (unused in this screen). */
  mistakes?: any[];
  /** User's saved favourite songs (unused in this screen). */
  favorites?: any[];
};

/**
 * A single song recommendation returned by `POST /recommendations/only-new`.
 */
type SongItem = {
  /** Legacy numeric or string ID (may be absent for newer documents). */
  id?: string | number;
  /** MongoDB ObjectId string – preferred ID when present. */
  _id?: string;
  /** Song title. */
  title: string;
  /** Artist / band name. */
  artist: string;
  /** Genre key matching a key in {@link genreLabels} (e.g. `"rock"`). */
  genre: string;
  /** Vocabulary words in this song that are new to the user. */
  newWords: string[];
  /** Full lyrics text or serialised lyrics JSON (optional, may be missing). */
  lyrics?: string;
  /** Cover image: a URL, a key in the {@link artistImages} map, or null. */
  picture?: string | null;
};

/**
 * A single genre section shown in the scrollable list.
 * `title` holds the raw English genre key used to look up the Hebrew label.
 */
type Section = { title: string; data: SongItem[] };

/**
 * `CategoryScreen` – the main export for the `/category/[cat]` route.
 *
 * ### Route params
 * | Param    | Type     | Description |
 * |----------|----------|-------------|
 * | `cat`    | `string` | English category key, e.g. `"Animals"`. |
 * | `userId` | `string` | Optional – forwarded to the song screen for
 *              analytics / server-side logging. |
 *
 * ### State summary
 * | State       | Purpose |
 * |-------------|----------|
 * | `loading`   | Shows a full-screen spinner on first load. |
 * | `refreshing`| Tracks pull-to-refresh in progress. |
 * | `sections`  | Ordered array of genre sections each with their songs. |
 * | `error`     | Non-null when the load pipeline threw. |
 * | `userLevel` | Cached user level forwarded to the song screen. |
 */
export default function CategoryScreen() {
  const { cat, userId: passedUserId } = useLocalSearchParams<{
    cat: string;
    userId?: string;
  }>();
  const category = useMemo(() => String(cat ?? "").trim(), [cat]);
  const categoryHebrew = categoryHebrewMap[category] || category;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<number>(0);

  // -------------------------------------------------------------------------
  // Data-fetching helpers (all wrapped in useCallback for stable references)
  // -------------------------------------------------------------------------

  /**
   * Reads the stored credentials from SecureStore and fetches the authenticated
   * user's public profile from the server.
   *
   * @throws When `user_id` or `auth_token` are missing from SecureStore, or
   *         when the server returns a non-OK response, or when required fields
   *         (`level`, `genres`, `wordHistory`) are absent from the response.
   * @returns A {@link UserPublic} object with at minimum `level`, `genres`, and
   *          `wordHistory` populated.
   */
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

  /**
   * Requests song recommendations from the server for the current category.
   *
   * Sends the user's `wordHistory`, `genres`, and `level` together with the
   * `category` route param to `POST /recommendations/only-new`.  The server
   * returns a map of `{ [genre]: SongItem[] }` containing only songs whose
   * vocabulary the user has not yet encountered.
   *
   * Results are persisted to AsyncStorage (`recommendations_cache` + `user_level`)
   * so that a subsequent cold start can show stale data while a fresh request
   * is in flight.
   *
   * @param user - The resolved {@link UserPublic} from {@link loadUser}.
   * @returns An array of {@link Section} objects ready to be rendered, with
   *          empty genre sections filtered out.
   * @throws On network errors or when the server response cannot be parsed as JSON.
   */
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
        await AsyncStorage.setItem(
          "recommendations_cache",
          JSON.stringify(filtered)
        );
        await AsyncStorage.setItem("user_level", String(user.level));
      } catch (err) {
        console.warn("[CACHE] failed to save recommendations:", err);
      }

      return filtered;
    },
    [category]
  );

  /**
   * Full load pipeline: fetches the user profile then the recommendations and
   * stores both in component state.  Drives the initial `loading` spinner shown
   * on first mount.
   */
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await loadUser();
      setUserLevel(user.level);
      const s = await fetchRecommendations(user);
      setSections(s);
    } catch (e: any) {
      setSections([]);
      setError(e?.message || "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  }, [loadUser, fetchRecommendations]);

  /**
   * Pull-to-refresh handler.  Repeats the same load pipeline as {@link load}
   * but uses the `refreshing` flag instead of `loading` so the existing list
   * remains visible behind the refresh indicator.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const user = await loadUser();
      setUserLevel(user.level);
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

  /**
   * Converts an arbitrary string into a URL-safe slug suitable for use as a
   * local cache key or route parameter when a song has no server-assigned ID.
   *
   * Steps: lower-case → trim → collapse whitespace to `-` → strip
   * non-alphanumeric characters → limit to 64 characters.
   *
   * @example slugify("All Too Well") // "all-too-well"
   */
  const slugify = (s: string) =>
    String(s)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .slice(0, 64);

  /**
   * Called when the user taps a song card.  Performs the following steps
   * before navigating:
   *   1. Resolves the song's unique ID (`_id` → `id` → generated slug).
   *   2. Writes `newWords` and `lyrics` to AsyncStorage so they are available
   *      offline when the song screen mounts.
   *   3. Writes a `@songMeta/<songId>` cache entry with the display metadata
   *      (title, artist, genre, picture, lyrics) for the song screen.
   *   4. Pushes `/songs/[song]` with all necessary route params.
   *
   * Write failures are swallowed with a warning so that navigation still
   * proceeds even when AsyncStorage is unavailable.
   *
   * @param item       - The tapped {@link SongItem}.
   * @param genreLabel - Hebrew genre display label (e.g. `"רוק"`) forwarded
   *                     to the song screen for display.
   */
  const handleOpenSong = useCallback(
    async (item: SongItem, genreLabel: string) => {
      // Prioritize _id (MongoDB), then id, then create slug
      const songId = item._id
        ? String(item._id)
        : item.id
          ? String(item.id)
          : slugify(`${item.title}-${item.artist}`);

      try {
        if (item.newWords?.length) {
          await saveNewWords(songId, item.newWords);
        }
        if (item.lyrics) {
          await saveLyrics(
            songId,
            typeof item.lyrics === "string"
              ? item.lyrics
              : JSON.stringify(item.lyrics)
          );
        }
        // Cache basic song data for display in /songs/[song]
        await AsyncStorage.setItem(
          `@songMeta/${songId}`,
          JSON.stringify({
            id: songId,
            title: item.title,
            artist: item.artist,
            genre: genreLabel,
            picture: item.picture ?? "",
            lyrics: item.lyrics || null,
          })
        );
      } catch (e) {
        console.warn("[song/open] failed to cache song data:", e);
      }

      router.push({
        pathname: "/songs/[song]",
        params: {
          song: songId,
          title: item.title,
          artist: item.artist,
          picture: item.picture ?? "",
          lyrics: item.lyrics || null,
          level: userLevel,
          userId: passedUserId,
        },
      });
    },
    [userLevel, passedUserId]
  );

  /**
   * Resolves a song's `picture` field to a React Native `ImageSource`.
   *
   * - If `picture` is falsy, returns `null` (a placeholder icon is shown).
   * - If `picture` starts with `http://` or `https://`, wraps it in a
   *   `{ uri }` object for remote loading.
   * - Otherwise treats `picture` as a key into the statically-imported
   *   {@link artistImages} map (bundled local assets).
   *
   * @param picture - Raw picture value from the API.
   * @returns A React Native image source or `null`.
   */
  const getImageSource = (picture?: string | null) => {
    if (!picture) return null;
    // if it's a full URL, use it directly
    if (/^https?:\/\//.test(picture)) return { uri: picture };
    // otherwise, look up in the imported artistImages map
    return artistImages[picture] ?? null;
  };

  // -------------------------------------------------------------------------
  // Render
  // Three early-return states (loading / error / empty) keep the happy-path
  // JSX below clean and readable.
  // -------------------------------------------------------------------------

  /** Full-screen loading state shown on first mount while data is fetched. */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>
          טוען שירים לקטגוריה: {categoryHebrew}
        </Text>
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
      <Image
        source={require("@/assets/images/especially_for_you.png")}
        style={styles.bannerImage}
        resizeMode="cover"
      />
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
                            <View
                              style={[styles.vcover, styles.coverPlaceholder]}
                            >
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#FFF",
  },
  bannerImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 4,
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    color: COLORS.secondary,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 8,
    color: "#333",
    textAlign: "right",
  },

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

  songTitleCenter: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
  },
  songArtistCenter: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
    textAlign: "center",
  },
  songGenreCenter: {
    fontSize: 11,
    color: "#777",
    marginTop: 2,
    textAlign: "center",
  },

  sep: { height: 10 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: COLORS.bgLight,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center" },
  error: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B00020",
    marginBottom: 6,
    textAlign: "center",
  },
  errorSmall: {
    fontSize: 12,
    color: "#B00020",
    marginBottom: 12,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: { color: "#003B3B", fontWeight: "800" },
});
