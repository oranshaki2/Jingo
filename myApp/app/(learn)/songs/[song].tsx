/**
 * @file app/(learn)/songs/[song].tsx
 * @description Song detail / pre-play screen for the Jingo language-learning app.
 *
 * This screen is reached via the route `/songs/<songId>` after the user taps a
 * song card in the category screen (`/category/[cat]`).
 *
 * ### Responsibilities
 * 1. Reads all song data from AsyncStorage (written by the category screen):
 *    - `@songMeta/<songId>`  – title, artist, genre, picture
 *    - `@newWords/<songId>`  – vocabulary words new to this user
 *    - `@lyrics/<songId>`   – full lyrics string
 *    - `user_level`         – cached difficulty level (1–3)
 * 2. Loads word-timing data (timestamps) from bundled JSON assets so the
 *    karaoke player can highlight words in sync with audio.
 * 3. Displays a summary card (artist, title, new words, cover art) together
 *    with a level indicator chip row.
 * 4. Navigates to `/songs/player` with all preloaded data when the user taps
 *    the start button.
 *
 * All user-facing strings are displayed in Hebrew.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { artistImages } from "@/assets/artistsMap";
import { loadTimestampsAsset } from "@/utils/timestampsLoader"; 

/**
 * Resolves a raw `picture` value from the API to a React Native `ImageSource`.
 *
 * Resolution order:
 * 1. `null` / empty string → returns `null` (caller should render a placeholder).
 * 2. Absolute HTTP/HTTPS URL → wraps in `{ uri }` for remote loading.
 * 3. Anything else → looked up as a key in the statically-imported
 *    {@link artistImages} asset map (bundled local assets).
 *
 * @param picture - Raw picture field from the song metadata.
 * @returns A React Native `ImageSourcePropType` or `null`.
 */
const getImageSource = (picture?: string | null) => {
  if (!picture) return null;
  if (/^https?:\/\//.test(picture)) return { uri: picture };
  return artistImages[picture] ?? null;
};

/**
 * Loads word-timing timestamps for a song from the bundled JSON asset files
 * located in `assets/timestamps/`.
 *
 * The file name is derived from the song title by
 * {@link loadTimestampsAsset}, which normalises the title to a snake_case
 * slug.  If a matching file is found the timestamps array is re-serialised as
 * `{ timestamps: number[] }` so it can be forwarded as a route param string.
 *
 * Timestamps are millisecond offsets used by the karaoke player to highlight
 * the current lyric line in sync with the audio track.
 *
 * @param title - The song title as stored in metadata (e.g. `"All Too Well"`).
 * @returns A JSON string `{ timestamps: number[] }`, or an empty string when
 *          no matching asset file exists or loading fails.
 */
const loadTimestampsForSong = (title: string): string => {
  try {
    const timestampArray = loadTimestampsAsset(title);
    if (timestampArray && timestampArray.length > 0) {
      return JSON.stringify({ timestamps: timestampArray });
    }
    return "";
  } catch (e) {
    console.warn("[song] Failed to load timestamps:", e);
    return "";
  }
};

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
  /** Mint green – active difficulty chip background. */
  chipOn: "#CDEEDC",
  /** Light grey – inactive difficulty chip background. */
  chipOff: "#E9E6E6",
  /** Very light teal – cover image placeholder background. */
  placeholderBg: "#DDF4F4",
};

/**
 * Expo Router route params accepted by this screen.
 *
 * | Param    | Description |
 * |----------|-------------|
 * | `song`   | Unique song ID (MongoDB `_id` or generated slug). Used as the
 *              AsyncStorage key prefix to load cached song data. |
 * | `userId` | Optional. Authenticated user's ID, forwarded to the player
 *              screen for server-side event logging. |
 */
type Params = {
  song?: string;
  userId?: string;
};

/**
 * Song display metadata cached by the category screen under the AsyncStorage
 * key `@songMeta/<songId>`.
 */
type SongMeta = {
  /** Song title shown in the header and forwarded to the player. */
  title: string;
  /** Artist / band name displayed on the detail card. */
  artist: string;
  /** Optional genre label (Hebrew) shown on the detail card. */
  genre?: string;
  /** Cover image: a URL, an {@link artistImages} map key, or null/undefined. */
  picture?: string | null;
};

/**
 * `SongScreen` – the main export for the `/songs/[song]` route.
 *
 * Displays a song summary page with difficulty chips, metadata cards
 * (artist, title, new vocabulary), a cover image, and a start button that
 * launches the karaoke player.
 *
 * ### State summary
 * | State        | Purpose |
 * |--------------|----------|
 * | `level`      | Numeric difficulty (1 = easy, 2 = medium, 3 = hard) loaded
 *                  from `user_level` AsyncStorage key. |
 * | `meta`       | {@link SongMeta} with title, artist, genre, picture. |
 * | `newWords`   | Vocabulary words new to this user for this song. |
 * | `lyrics`     | Full lyrics string used by the karaoke player. |
 * | `timestamps` | Serialised `{ timestamps: number[] }` for karaoke sync. |
 * | `showImage`  | Controls whether the `<Image>` element or placeholder is
 *                  rendered; flips to `false` on image load errors. |
 */
export default function SongScreen() {
  const params = useLocalSearchParams<Params>();
  /** Resolved unique song identifier used as the AsyncStorage key prefix. */
  const songId = String(params.song ?? "").trim();
  const userId = params.userId;

  const [level, setLevel] = useState<number | null>(null);
  const [meta, setMeta] = useState<SongMeta | null>(null);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState<string>("");
  const [timestamps, setTimestamps] = useState<string>("");

  // -------------------------------------------------------------------------
  // Load all song data from AsyncStorage on mount / when songId changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Guard flag prevents setState calls after the component has unmounted,
    // which would trigger React's "update on unmounted component" warning.
    let mounted = true;

    async function loadAll() {
      try {
        // User difficulty level – cached by the category screen as a plain
        // number string.  Falls back to null if the key is missing.
        const lvl = await AsyncStorage.getItem("user_level");
        if (mounted) setLevel(lvl ? Number(lvl) : null);

        // Song display metadata (title, artist, genre, picture).
        const metaRaw = await AsyncStorage.getItem(`@songMeta/${songId}`);
        const metaParsed = metaRaw ? (JSON.parse(metaRaw) as SongMeta) : null;
        if (mounted) setMeta(metaParsed);

        // New vocabulary words for this song – an array of word strings.
        const wordsRaw = await AsyncStorage.getItem(`@newWords/${songId}`);
        const wordsParsed = wordsRaw ? (JSON.parse(wordsRaw) as string[]) : [];
        // Defensive check: ensure the parsed value is actually an array.
        if (mounted) setNewWords(Array.isArray(wordsParsed) ? wordsParsed : []);

        // Full lyrics string – may be plain text or serialised JSON depending
        // on how the category screen stored it.
        const lyr = (await AsyncStorage.getItem(`@lyrics/${songId}`)) || "";
        if (mounted) setLyrics(lyr || "");

        // Timestamps from bundled asset files.
        // Format expected by the player: { timestamps: [0, 2400, 4800, ...] }
        // One timestamp per lyric line, in milliseconds.
        if (metaParsed?.title) {
          const tsString = loadTimestampsForSong(metaParsed.title);
          if (mounted) setTimestamps(tsString);
        }
      } catch (e) {
        console.warn("[song] failed to load storage:", e);
        // Reset all state to safe defaults so the UI renders without crashing.
        if (mounted) {
          setMeta(null);
          setNewWords([]);
          setLyrics("");
          setTimestamps("");
        }
      }
    }

    if (songId) loadAll();
    return () => {
      // Cleanup: prevent state updates after unmount.
      mounted = false;
    };
  }, [songId]);

  // -------------------------------------------------------------------------
  // Cover image – resolved once meta is available
  // -------------------------------------------------------------------------
  /** Resolved React Native image source, or `null` if no picture is available. */
  const imageSource = getImageSource(meta?.picture);
  /**
   * Controls whether the `<Image>` element is rendered.  Initialised from
   * `imageSource` and also flipped to `false` by the `onError` callback if the
   * remote image fails to load, causing the placeholder to be shown instead.
   */
  const [showImage, setShowImage] = useState<boolean>(!!imageSource);
  // Keep showImage in sync whenever the resolved source changes (e.g. after
  // async meta finishes loading).
  useEffect(() => setShowImage(!!imageSource), [imageSource]);

  // -------------------------------------------------------------------------
  // Difficulty level helpers
  // -------------------------------------------------------------------------
  /**
   * Maps the numeric `level` value (1–3) to its Hebrew display label used by
   * the difficulty chip row.
   *
   * | Numeric | Hebrew  |
   * |---------|---------|
   * | 1       | קל      |
   * | 2       | בינוני  |
   * | 3       | קשה     |
   * | other   | קל      | (safe default)
   */
  const levelLabel = useMemo(() => {
    if (level === 1) return "קל";
    if (level === 2) return "בינוני";
    if (level === 3) return "קשה";
    return "קל";
  }, [level]);

  /**
   * Returns `true` when a given chip label matches the current difficulty,
   * driving the active/inactive chip background colour.
   */
  const isActive = (key: "קל" | "בינוני" | "קשה") => levelLabel === key;

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  /**
   * Navigates to the karaoke player screen (`/songs/player`) passing all
   * preloaded song data as route params.
   *
   * ### Params forwarded to the player
   * | Param        | Value |
   * |--------------|-------|
   * | `title`      | Song title (falls back to `"Unknown"`). |
   * | `artist`     | Artist name (falls back to `"Unknown"`). |
   * | `lyrics`     | Full lyrics string or `null` if unavailable. |
   * | `timestamps` | Serialised `{ timestamps: number[] }` or `null`. |
   * | `song`       | The `songId` used as a cache key. |
   * | `userId`     | Authenticated user ID for server logging. |
   *
   * The start button is disabled (`disabled={!songId}`) so this handler is
   * never called with an empty `songId`.
   */
  const onStart = () => {
    router.push({
      pathname: "/songs/player",
      params: {
        title: meta?.title ?? "Unknown",
        artist: meta?.artist ?? "Unknown",
        lyrics: lyrics || null,
        timestamps: timestamps || null,
        song: songId,
        userId,
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: meta?.title ?? "Song" }} />

      {/* levels- centered*/}
      <View style={styles.levelRow}>
        {["קשה", "בינוני", "קל"].map((lbl) => (
          <View
            key={lbl}
            style={[
              styles.chip,
              { backgroundColor: isActive(lbl as any) ? COLORS.chipOn : COLORS.chipOff },
            ]}
          >
            <Text style={[styles.chipText, { color: isActive(lbl as any) ? "#2D6A4F" : "#444" }]}>
              {lbl}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card: Artist */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>אמן</Text>
          <Text style={styles.cardValue}>{meta?.artist || "—"}</Text>
        </View>

        {/* Card: Title */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>שם השיר</Text>
          <Text style={styles.cardValue}>{meta?.title || "—"}</Text>
        </View>

        {/* Card: New Words */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>מילים שנלמד</Text>
          <Text style={styles.cardValue}>
            {newWords.length ? newWords.join(", ") : "—"}
          </Text>
        </View>

        {/* Cover Image */}
         <View style={styles.coverWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.cover}
              resizeMode="cover"
              onError={() => setShowImage(false)}
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <View style={styles.noteBadge}>
                <Text style={styles.noteText}>♪</Text>
              </View>
              <Text style={styles.placeholderText}>No Cover</Text>
            </View>
          )}
        </View>

        {/* start button - centered*/}
        <Pressable style={styles.startBtn} onPress={onStart} disabled={!songId}>
          <Text style={styles.startText}>התחל</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#FFF" },

  levelRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: { fontWeight: "700", textAlign: "center" },

  content: {
    padding: 16,
    paddingBottom: 32,
    alignItems: "center",
  },

  card: {
    width: "92%",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: "center",
  },
  cardLabel: {
    color: "#7A7A7A",
    marginBottom: 6,
    fontSize: 13,
    textAlign: "center",
  },
  cardValue: {
    color: COLORS.textDark,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  coverWrap: { alignItems: "center", marginTop: 8 },

  cover: {
    width: 250,
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E9F4F4",
    borderWidth: 2,
    borderColor: "#9FD9D9",
  },

  coverPlaceholder: {
    backgroundColor: COLORS.placeholderBg,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBadge: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 1,
  },
  noteText: { fontSize: 34, color: COLORS.primary, fontWeight: "800" },
  placeholderText: { color: "#9AA1A9", fontWeight: "600" },

  startBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: "center",
  },
  startText: { color: "#003B3B", fontWeight: "900", fontSize: 16, textAlign: "center" },
});
