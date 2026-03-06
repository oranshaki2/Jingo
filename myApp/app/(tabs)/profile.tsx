// app/(tabs)/profile.tsx
// The Profile screen shows a summary of the logged-in user's learning progress:
//   - "Mistakes"       — words the user answered incorrectly in exercises
//   - "Learned Words"  — words the user has seen and practised
//   - "Song History"   — songs the user has previously studied (tap to reopen)
//
// Each section is displayed as a collapsible accordion panel.
// Only one panel can be open at a time.
// All data is fetched from the backend API using the saved auth token.

// React core + hooks:
// useEffect   = run side-effects (e.g. fetching data) after the component mounts
// useState    = manage pieces of changing data
// useMemo     = cache computed values so they don't re-run on every render
// useCallback = cache a function reference so it isn't recreated every render
import React, { useEffect, useState, useMemo, useCallback } from "react";

// expo-image is a faster/more feature-rich Image component than the built-in one
import { Image } from "expo-image";

// UI primitives from React Native:
// View              = layout box
// Text              = text label
// StyleSheet        = creates optimised style objects
// ActivityIndicator = spinning loading indicator
// Pressable         = tappable element
// ScrollView        = scrollable container
// Alert             = popup dialog
// PixelRatio        = utilities for converting between CSS units and device pixels
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

// SafeAreaView adds padding so content doesn't overlap the device's notch/status-bar
import { SafeAreaView } from "react-native-safe-area-context";

// useFocusEffect runs a callback every time this screen comes into focus
// (e.g. when the user navigates back to it from another screen)
import { useFocusEffect } from "@react-navigation/native";

// SecureStore stores sensitive data (auth token, user id) encrypted on the device
import * as SecureStore from "expo-secure-store";

// AsyncStorage is a simple key-value store for non-sensitive data
// (we use it to cache song metadata and lyrics so the song screen loads fast)
import AsyncStorage from "@react-native-async-storage/async-storage";

// Stack = configure the navigation header; router = navigate between screens
import { Stack, router } from "expo-router";

// A map of artist name keys → local image files (e.g. "taylor_swift" → require(...))
import { artistImages } from "@/assets/artistsMap";

// ---------------------------------------------------------------------------
// translations — a JSON dictionary mapping English words to their Hebrew translations.
// Generated automatically by a Python script in the dataset folder.
// Example: { "dog": "כלב", "cat": "חתול", ... }
// ---------------------------------------------------------------------------
// translations generated from dataset/semantics/category_in_hebrew.py
const translations: Record<
  string,
  string
> = require("../../assets/translations_he.json");

// ---------------------------------------------------------------------------
// getHebrew — looks up the Hebrew translation for a given English word.
// Returns the translation string, or null if no translation is found.
// The lookup is case-insensitive (everything is lowercased before searching).
// ---------------------------------------------------------------------------
const getHebrew = (word: string) => {
  if (!word) return null;
  return translations[String(word).trim().toLowerCase()] ?? null;
};

// ---------------------------------------------------------------------------
// COLORS — centralised colour palette for the entire screen.
// Changing a value here updates every element that uses that colour.
// ---------------------------------------------------------------------------
const COLORS = {
  primary: "#4EC4C4", // teal — accordion active state, underline, spinner
  secondary: "#1A3D5A", // dark navy — headings and text
  bgLight: "#F5F7F9", // very light grey — screen background
  textDark: "#333333", // near-black — body text
  accent: "#A8E6CF", // soft mint — accent highlights
};

// The backend API base URL, read from the app's environment config
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// ---------------------------------------------------------------------------
// getImageSource — converts a `picture` value from the API into a React Native
// image source object.
//   - If picture is a URL  → returns { uri: "https://..." } (remote image)
//   - If picture is a key  → looks it up in the local artistImages map
//   - If picture is empty  → returns null (no image)
// ---------------------------------------------------------------------------
const getImageSource = (picture?: string | null) => {
  if (!picture) return null;
  if (/^https?:\/\//.test(picture)) return { uri: picture }; // remote URL
  return artistImages[picture] ?? null; // local artist image key
};

// ---------------------------------------------------------------------------
// cmToPx — converts centimetres to device pixels.
// Used to set the maximum height of scrollable lists in physical units
// so the lists look the same size regardless of screen resolution.
// ---------------------------------------------------------------------------
// convert cm to device pixels (approx)
const cmToPx = (cm: number) => {
  const dpi = PixelRatio.get() * 160; // approximate device DPI
  return Math.round((cm / 2.54) * dpi);
};

// ---------------------------------------------------------------------------
// Profile Component
// Fetches and displays the user's learning progress in three collapsible sections.
// ---------------------------------------------------------------------------
export default function Profile() {
  // --- Loading / error state ---
  const [loading, setLoading] = useState(true); // true while data is being fetched
  const [err, setErr] = useState<string | null>(null); // error message if the fetch fails

  // --- Data fetched from the server ---
  const [mistakes, setMistakes] = useState<string[]>([]); // words the user got wrong
  const [learned, setLearned] = useState<string[]>([]); // words the user has practised
  const [favorites, setFavorites] = useState<
    // songs the user has studied
    { id?: string; title: string; artist: string }[]
  >([]);

  // --- Accordion open/closed state ---
  // Only one accordion is open at a time; the others are forced closed when one opens.
  const [openMistakes, setOpenMistakes] = useState(false);
  const [openLearned, setOpenLearned] = useState(false);
  const [openFavorites, setOpenFavorites] = useState(false);

  // ---------------------------------------------------------------------------
  // listMaxHeight — the maximum height (in pixels) of any accordion's scrollable list.
  // Fixed at ~10 cm in physical size so it looks consistent across screen sizes.
  // useMemo means this is calculated once and cached — cmToPx never changes.
  // ---------------------------------------------------------------------------
  // compute maxHeight for lists: 10cm
  const listMaxHeight = useMemo(() => {
    return cmToPx(10);
  }, []);

  // ---------------------------------------------------------------------------
  // learnedSet / mistakesSet / favTitleSet
  // Pre-built lowercase Sets used to quickly check whether a word or song title
  // appears in more than one list (learned AND mistakes, etc.).
  // A Set lookup is O(1), much faster than scanning an array each time.
  // Recalculated only when learned, mistakes, or favorites change.
  // ---------------------------------------------------------------------------
  // compute lowercase lookup sets to find items present across lists
  const { learnedSet, mistakesSet, favTitleSet } = useMemo(() => {
    const l = new Set(learned.map((s) => String(s).trim().toLowerCase()));
    const m = new Set(mistakes.map((s) => String(s).trim().toLowerCase()));
    const f = new Set(
      favorites.map((fv) =>
        String(fv.title ?? "")
          .trim()
          .toLowerCase(),
      ),
    );
    return { learnedSet: l, mistakesSet: m, favTitleSet: f };
  }, [learned, mistakes, favorites]);

  // ---------------------------------------------------------------------------
  // isLearnedDifferent — returns true if the word appears ONLY in the learned list
  // (not also in mistakes or favorites). Used to apply a highlight style.
  // ---------------------------------------------------------------------------
  const isLearnedDifferent = (word: string) => {
    const w = String(word).trim().toLowerCase();
    return !mistakesSet.has(w) && !favTitleSet.has(w);
  };

  // ---------------------------------------------------------------------------
  // isMistakeDifferent — returns true if the word appears ONLY in the mistakes list.
  // ---------------------------------------------------------------------------
  const isMistakeDifferent = (word: string) => {
    const w = String(word).trim().toLowerCase();
    return !learnedSet.has(w) && !favTitleSet.has(w);
  };

  // ---------------------------------------------------------------------------
  // isFavoriteDifferent — returns true if the song title appears ONLY in favorites.
  // ---------------------------------------------------------------------------
  const isFavoriteDifferent = (title: string) => {
    const t = String(title).trim().toLowerCase();
    return !learnedSet.has(t) && !mistakesSet.has(t);
  };

  // ---------------------------------------------------------------------------
  // Data-fetching effect — runs once when the screen mounts.
  //
  // Steps:
  //   1. Read the userId and auth token from secure device storage.
  //   2. Send a GET /users/:id request to the backend (auth token in the header).
  //   3. Store the returned mistakes and word history in state.
  //   4. Resolve each favourite (which the backend stores as a song ID) to a
  //      { title, artist } object by fetching each song individually.
  //   5. On error, show an alert with the error message.
  //
  // The `mounted` flag prevents state updates if the component unmounts
  // while the async fetch is still in progress (avoids memory leak warnings).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true; // flipped to false if the component unmounts mid-fetch
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Step 1: get credentials from encrypted device storage
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");

        if (!userId || !token) {
          throw new Error("לא נמצאו פרטי משתמש (user_id/auth_token).");
        }

        // Step 2: fetch the user's profile from the server
        const res = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }, // prove who we are
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`שגיאת רשת: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!mounted) return; // component unmounted while fetching — bail out

        // Step 3: store mistakes and learned words
        // apply parsers
        setMistakes(data.mistakes ?? []);
        setLearned(data.wordHistory ?? []);

        // Step 4: resolve favorites
        // The backend stores favorites as song ObjectId strings (just the ID).
        // We need to turn each ID into a { title, artist } object the UI can display.
        const rawFavs = Array.isArray(data.favorites) ? data.favorites : [];

        // favorites in the backend are saved as song ObjectId strings.
        // Resolve them to { title, artist } by fetching each song.
        const resolvedFavs = await Promise.all(
          rawFavs.map(async (fav: any) => {
            if (!fav) return null;

            // If the API already returned a full object (with title), use it directly
            // if already an object with title -> use it
            if (typeof fav === "object" && (fav.title || fav.name)) {
              return {
                id: fav._id ?? fav.id ?? undefined,
                title: fav.title ?? fav.name ?? "",
                artist: fav.artist ?? fav.performer ?? "",
              };
            }

            // Otherwise it's just an ID string — fetch the full song details
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
                  songRes.status,
                );
                return null; // skip this entry if it can't be resolved
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
          }),
        );

        // Filter out any nulls (failed fetches) and save to state
        if (mounted)
          setFavorites(
            resolvedFavs.filter(Boolean) as { title: string; artist: string }[],
          );
      } catch (e: any) {
        // Step 5: something went wrong — show the error
        console.warn("Profile fetch error:", e);
        setErr(e?.message ?? "אירעה שגיאה בטעינת פרופיל");
        Alert.alert("שגיאה", e?.message ?? "אירעה שגיאה בטעינת פרופיל");
      } finally {
        if (mounted) setLoading(false); // always hide the spinner when done
      }
    })();

    // Cleanup function: mark the component as unmounted so in-flight
    // async operations don't try to update state after unmount
    return () => {
      mounted = false;
    };
  }, []); // empty array = run only once when the screen first mounts

  // ---------------------------------------------------------------------------
  // useFocusEffect — runs every time the user navigates TO this screen
  // (including when they press the Back button from another screen).
  // We use it to collapse all open accordion panels so the screen always
  // starts in a clean, collapsed state when revisited.
  // useCallback with [] ensures the callback reference is stable and doesn't
  // re-register the effect on every render.
  // ---------------------------------------------------------------------------
  // Close any open lists when the screen gains focus (e.g. when returning)
  useFocusEffect(
    useCallback(() => {
      setOpenMistakes(false);
      setOpenLearned(false);
      setOpenFavorites(false);
      return () => {}; // no cleanup needed
    }, []),
  );

  // ---------------------------------------------------------------------------
  // handleFavoritePress — called when the user taps a song in the Song History list.
  //
  // It does several things before navigating to the song screen:
  //   1. Fetch the latest song data from the server (to get fresh lyrics + metadata).
  //   2. Resolve the artist image key (converts "Taylor Swift" → "taylor_swift"
  //      and checks if we have a local image for them).
  //   3. Cache the lyrics and metadata in AsyncStorage so the song screen
  //      loads instantly without waiting for another network request.
  //   4. Pick a random vocabulary category from the song's word list and cache
  //      up to 8 words from it (used to pre-populate exercises on the song screen).
  //   5. Navigate to the song screen, passing all necessary data as route params.
  //
  // If no song ID is available (edge case), falls back to navigating by song title.
  // ---------------------------------------------------------------------------
  // Handle favorite press: fetch song info, store meta/lyrics, pick random category, navigate
  const handleFavoritePress = async (fav: {
    id?: string;
    title: string;
    artist: string;
  }) => {
    try {
      const id = fav.id;

      // Default values used if the server fetch fails or is skipped
      // prepare fallback meta values (used for routing & caching)
      let metaTitle = fav.title;
      let metaArtist = fav.artist ?? "";
      let picture: string | null = "";
      let lyrics: string | null = null;

      if (id) {
        // Step 1: fetch the full song details from the server
        const token = await SecureStore.getItemAsync("auth_token");
        const res = await fetch(`${API_URL}/songs/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const song = await res.json();

          // Step 2: resolve the artist image
          // Convert artist name to a key format: "Taylor Swift" → "taylor_swift"
          let displayPicture: string | null = null;
          if (song.artist) {
            const artistKey = String(song.artist ?? "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "_"); // replace spaces with underscores

            // Check if we have a local image for this artist
            if (artistImages[artistKey]) {
              displayPicture = artistKey;
            }
          }

          // Update metadata with fresh values from the server
          metaTitle = song.title ?? song.name ?? metaTitle;
          metaArtist = song.artist ?? song.performer ?? metaArtist;

          // Step 3a: cache the lyrics so the song screen loads them instantly
          if (song.lyrics) {
            const lyricsStr =
              typeof song.lyrics === "string"
                ? song.lyrics
                : JSON.stringify(song.lyrics); // handle object or string format
            lyrics = lyricsStr;
            await AsyncStorage.setItem(`@lyrics/${id}`, lyricsStr);
          }

          // Step 3b: cache song metadata (title, artist, genre, picture, lyrics)
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
            }),
          );

          // Step 4: extract a category→words map from the song data.
          // The backend may return this in several different field shapes,
          // so we try multiple known field names in order.
          // extract categories -> words mapping from the API response
          const extractCategoryMap = (
            s: any,
          ): Record<string, string[]> | null => {
            // Try the most common direct field names first
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

            // Try the { category_words: [[word, ...], ...], categories: [name, ...] } shape
            if (Array.isArray(s.category_words) && s.category_words.length) {
              const cw = s.category_words;
              let cats: string[] = [];
              if (
                Array.isArray(s.categories) &&
                s.categories.length === cw.length
              ) {
                cats = s.categories as string[];
              } else {
                // auto-generate category names if none provided
                for (let i = 0; i < cw.length; i++) cats.push(`cat${i + 1}`);
              }
              const map: Record<string, string[]> = {};
              for (let i = 0; i < cw.length; i++) {
                const entry = cw[i];
                if (Array.isArray(entry)) {
                  // filter out pure-number strings (they're not vocabulary words)
                  const words = entry.filter(
                    (w: any) => typeof w === "string" && !/^\d+$/.test(w),
                  );
                  map[cats[i]] = words.map((w: any) => String(w));
                } else {
                  map[cats[i]] = [];
                }
              }
              return map;
            }

            // Try the { categories: [{ name, words }, ...] } shape
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

            // Try the { categories: [...], words: { cat: [...] } } shape
            if (
              Array.isArray(s.categories) &&
              s.words &&
              typeof s.words === "object"
            ) {
              return s.words;
            }

            return null; // could not find a usable category map
          };

          const catMap = extractCategoryMap(song);
          if (catMap) {
            const keys = Object.keys(catMap).filter(Boolean);
            if (keys.length > 0) {
              // Pick a random category from the song's vocabulary map
              const chosen = keys[Math.floor(Math.random() * keys.length)];
              const allWords = Array.isArray(catMap[chosen])
                ? catMap[chosen].filter(Boolean).map((w: any) => String(w))
                : [];
              // Pick up to 8 random words from that category
              const pickCount = Math.min(8, allWords.length);
              const picked: string[] = [];
              while (picked.length < pickCount && allWords.length) {
                const idx = Math.floor(Math.random() * allWords.length);
                picked.push(allWords.splice(idx, 1)[0]);
              }
              // Cache the chosen words so the song screen can use them for exercises
              if (picked.length)
                await AsyncStorage.setItem(
                  `@newWords/${id}`,
                  JSON.stringify(picked),
                );
            }
          }

          // Step 5: navigate to the song screen with all the prepared data
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

      // --- Fallback path: no song ID, or the server fetch failed ---
      // Navigate using the title encoded as a URL-safe string instead of an ID
      // fallback: if no id or fetch failed
      const encoded = encodeURIComponent(fav.title.trim());

      // Try to find a local artist image using the artist name as a key
      // Create artist key from favorite artist (spaces → underscores)
      let fallbackPicture = "";
      if (fav.artist) {
        const artistKey = String(fav.artist)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_");

        if (artistImages[artistKey]) {
          fallbackPicture = artistKey;
        }
      }

      // Cache minimal metadata so the song screen has something to display
      await AsyncStorage.setItem(
        `@songMeta/${encoded}`,
        JSON.stringify({
          id: encoded,
          title: fav.title,
          artist: fav.artist ?? "",
          picture: fallbackPicture,
          lyrics: null,
        }),
      );

      // Navigate using the encoded title as the route param
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

  // ---------------------------------------------------------------------------
  // Loading state — shown while the profile data is being fetched from the server.
  // Displays a full-screen centred spinner instead of an empty or broken layout.
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          {/* Large teal spinner centred on screen */}
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render — shown once data has loaded successfully.
  // Layout:
  //   ┌─────────────────────────────┐
  //   │  Header (title + GIF)       │
  //   ├─────────────────────────────┤
  //   │  ScrollView                 │
  //   │    ▸ Mistakes accordion      │
  //   │    ▸ Learned words accordion │
  //   │    ▸ Song history accordion  │
  //   └─────────────────────────────┘
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.wrap}>
      {/* Hide the default navigation header — we draw our own below */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- Screen header: title + animated bird GIF --- */}
      <View style={styles.header}>
        <Text style={styles.title}>פרופיל</Text>
        {/* Decorative teal underline beneath the title */}
        <View style={styles.titleUnderline} />
        {/* Animated GIF for a friendly, playful look */}
        <Image
          source={require("../../assets/gif/Happy Bird.gif")}
          style={{ width: 100, height: 100 }}
        />
      </View>

      {/* Outer ScrollView makes the whole page scrollable if content overflows */}
      <ScrollView contentContainerStyle={styles.container}>
        {/* ================================================================
            MISTAKES ACCORDION
            Shows every word the user has answered incorrectly.
            Each word also shows its Hebrew translation below it (if available).
            Words that appear ONLY in the mistakes list get a light-grey
            background highlight (diffLine style) to make them stand out.
        ================================================================ */}
        {/* Mistakes Accordion */}
        <View
          style={[styles.accordion, openMistakes && styles.accordionActive]}
        >
          {/* Accordion header row — tap to expand/collapse.
              Opening mistakes automatically closes the other two panels. */}
          <Pressable
            onPress={() => {
              setOpenMistakes((s) => !s); // toggle this panel
              setOpenLearned(false); // close the others
              setOpenFavorites(false);
            }}
            style={({ pressed }) => [
              styles.accordionHeader,
              pressed && styles.pressed,
              openMistakes && styles.accordionHeaderActive, // teal background when open
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: openMistakes }}
          >
            {/* Panel title: "Mistakes" in Hebrew */}
            <Text
              style={[
                styles.accordionTitle,
                openMistakes && styles.accordionTitleActive,
              ]}
            >
              טעויות
            </Text>
            {/* Arrow icon: ▲ when open, ▼ when closed */}
            <Text
              style={[
                styles.accordionToggle,
                openMistakes && styles.accordionToggleActive,
              ]}
            >
              {openMistakes ? "▲" : "▼"}
            </Text>
          </Pressable>

          {/* Body — only rendered when the accordion is open */}
          {openMistakes && (
            <View
              style={[
                styles.accordionBody,
                openMistakes && styles.accordionBodyActive,
                { maxHeight: listMaxHeight }, // cap height at ~10 cm; inner scroll handles overflow
              ]}
            >
              {/* nestedScrollEnabled allows this ScrollView to scroll independently
                  while inside the outer page ScrollView */}
              <ScrollView nestedScrollEnabled>
                {mistakes.length ? (
                  mistakes.map((w, i) => (
                    <Text
                      key={`${w}-${i}`}
                      style={[
                        styles.listItem,
                        openMistakes && styles.listItemActive,
                        isMistakeDifferent(w) && styles.diffLine, // grey bg if unique to mistakes
                      ]}
                    >
                      {w} {/* English word */}
                      {/* Hebrew translation on the line below (if we have it) */}
                      {getHebrew(w) ? (
                        <Text style={styles.translationText}>
                          {"\n" + getHebrew(w)}
                        </Text>
                      ) : null}
                    </Text>
                  ))
                ) : (
                  // Empty state message
                  <Text style={styles.emptyText}>אין טעויות לשלב זה.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ================================================================
            LEARNED WORDS ACCORDION
            Shows every English word the user has encountered in exercises.
            Same structure as the Mistakes accordion above.
            Words unique to this list (not in mistakes or favorites) are
            highlighted with a light-grey background.
        ================================================================ */}
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
            {/* Panel title: "Learned Words" in Hebrew */}
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

        {/* ================================================================
            SONG HISTORY ACCORDION
            Shows every song the user has previously studied.
            Each row is tappable — tapping opens the song's learning screen
            via handleFavoritePress (which also pre-caches lyrics and words).
            Format: "Song Title — Artist Name"
        ================================================================ */}
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
            {/* Panel title: "Song History" in Hebrew */}
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
                    // Each song entry is a tappable row
                    <Pressable
                      key={`${s.title}-${i}`}
                      onPress={() => handleFavoritePress(s)} // re-open this song
                      style={({ pressed }) => [
                        styles.favoriteRow,
                        openFavorites && styles.favoriteRowActive,
                        pressed && styles.pressed,
                        isFavoriteDifferent(s.title) && styles.diffLineFavRow, // grey if unique to favorites
                      ]}
                    >
                      <Text
                        style={[
                          styles.songTitle,
                          openFavorites && styles.songTitleActive,
                          isFavoriteDifferent(s.title) && styles.diffLineText,
                        ]}
                        numberOfLines={2} // cap at 2 lines for long titles
                        ellipsizeMode="tail" // show "..." if text exceeds 2 lines
                      >
                        {/* Show "Title — Artist" if artist is known, otherwise just the title */}
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

        {/* Extra space at the bottom so the last accordion doesn't sit right against the screen edge */}
        {/* small spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// StyleSheet.create compiles all styles once at startup for better performance.
// Styles marked with "Active" are applied on top of the base style when the
// corresponding accordion panel is open.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Full-screen wrapper — takes up the entire screen
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },

  // Fixed header at the top of the screen (title + animated GIF)
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },

  // "Profile" heading text
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
    textAlign: "center",
  },

  // Short teal bar drawn below the title as a decorative underline
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 10,
  },

  // ScrollView's inner content padding
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },

  // Used for the loading spinner screen — centres the spinner
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },

  // ---------------------------------------------------------------------------
  // Accordion styles
  // Each accordion is a rounded card with a header row and a collapsible body.
  // ---------------------------------------------------------------------------

  // Accordion: outer card (collapsed state)
  accordion: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden", // clips the body to the card's rounded corners
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },

  // Accordion: outer card when expanded — teal fill + teal border
  accordionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Header row: "row-reverse" puts the title on the right (RTL layout for Hebrew)
  accordionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
  },
  // Header row background when expanded
  accordionHeaderActive: {
    backgroundColor: COLORS.primary,
  },

  // Slight fade when a pressable is held down
  pressed: { opacity: 0.9 },

  // Section title text (e.g. "טעויות")
  accordionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
  },
  // Title colour when expanded (darker teal)
  accordionTitleActive: {
    color: "#003B3B",
  },

  // The ▲ / ▼ arrow indicator
  accordionToggle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginLeft: 8,
  },
  accordionToggleActive: {
    color: "#003B3B",
  },

  // Collapsible body area (the scrollable list of items)
  accordionBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FAFDFF",
  },
  // Body background when expanded
  accordionBodyActive: {
    backgroundColor: COLORS.primary,
  },

  // Individual word / phrase row in the mistakes or learned-words list
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ECEFF1",
    color: COLORS.textDark,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "700",
  },

  // Light grey highlight: applied when a word appears ONLY in this particular list
  diffLine: {
    backgroundColor: "#E6EEF0",
    borderBottomColor: "#E6EEF0",
  },
  // Same highlight for a favorite song row
  diffLineFavRow: {
    backgroundColor: "#E6EEF0",
    borderBottomColor: "#E6EEF0",
  },
  // Same highlight for the text inside a favorite row
  diffLineText: {
    backgroundColor: "#E6EEF0",
  },

  // Colour override for list items when the accordion is expanded
  listItemActive: {
    color: "#003B3B",
  },

  // Shown when a list has zero items
  emptyText: {
    paddingVertical: 8,
    color: "#777",
    textAlign: "center",
  },

  // A single song row in the Song History list (tappable)
  favoriteRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ECEFF1",
    alignItems: "center",
  },
  // Separator colour when the accordion is expanded
  favoriteRowActive: {
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  // Song title text inside a favorite row
  songTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "center",
  },
  songTitleActive: {
    color: "#003B3B",
  },

  // Hebrew translation shown below an English word in the Mistakes/Learned lists
  translationText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
});
