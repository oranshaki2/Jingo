// app/songs/player.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { audioMap } from "@/assets/audioMap";


/**
 * ===== How this page works =====
 * 1) Loads a local audio file (your MP3) and prepares the player.
 * 2) Calls Gemini with the provided prompt to fetch lyrics as JSON:
 *    { song, artist, lines: [{ english, hebrew }, ...] }
 * 3) Computes a naive sync: divides total audio duration by number of lines
 *    and highlights/scrolls to the current line during playback.
 * 4) Tapping a line seeks the audio to that line's estimated start time.
 *
 * NOTE: Because the model doesn't provide timestamps, we estimate timing by
 * evenly distributing the song duration across lines. This works reasonably
 * well for a first pass. If you ever add real timestamps, swap the math below.
 */

/** ===== Types ===== */
type LyricLine = { english: string; hebrew: string };
type LyricsPayload = {
  lines: LyricLine[];
};

/**
 * Gemini config: put your key in .env and expose it to the app:
 *   .env.local:
 *     EXPO_PUBLIC_GEMINI_API_KEY=YOUR_KEY_HERE
 * Then restart Expo. Never hardcode keys in source control.
 */
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-pro";

/** ===== Page Component ===== */
export default function SongPlayerScreen() {
  // useLocalSearchParams has a generic constraint 'Route' — cast the result instead of passing a generic.
  const params = useLocalSearchParams() as Partial<{ title: string; artist: string; lyrics: string}>;
  const title = params?.title || "Unknown Song";
  const artist = params?.artist || "Unknown Artist";
  const initialLyrics = params?.lyrics ?? "";

  // Normalize title for file naming (lowercase, no extra spaces)
const normalizedTitle = title.trim().toLowerCase();

const LOCAL_AUDIO =
  audioMap[normalizedTitle] ?? audioMap["you belong with me"];

if (!audioMap[normalizedTitle]) {
  console.warn(`Audio not found for "${normalizedTitle}", using fallback.`);
}

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [positionMs, setPositionMs] = useState(0);

  const [lyrics, setLyrics] = useState<LyricLine[] | null>(() => {
    if (!initialLyrics) return null;
    try {
      return JSON.parse(initialLyrics);
    } catch (e) {
      console.warn("Failed to parse initialLyrics:", e);
      return null;
    }
  });
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(!initialLyrics);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<FlatList<LyricLine>>(null);
  const lastAutoScrollIndex = useRef<number>(-1);

  /** ====== Derived sync helpers ======
   * Evenly assign time per line: totalDuration / lineCount.
   * Current line index = floor(position / msPerLine).
   */
  const msPerLine = useMemo(() => {
    if (!durationMs || !lyrics || lyrics.length === 0) return null;
    return durationMs / lyrics.length;
  }, [durationMs, lyrics]);

  const currentIndex = useMemo(() => {
    if (!msPerLine) return 0;
    const idx = Math.floor(positionMs / msPerLine);
    if (!lyrics) return 0;
    return Math.max(0, Math.min(lyrics.length - 1, idx));
  }, [positionMs, msPerLine, lyrics]);

  /** ===== Load audio ===== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoadingAudio(true);

        // Request audio focus on Android to duck other audio properly
        await Audio.setAudioModeAsync({
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound: s } = await Audio.Sound.createAsync(
          LOCAL_AUDIO,
          { shouldPlay: false, progressUpdateIntervalMillis: 150 },
          onPlaybackStatusUpdate
        );

        if (!mounted) {
          await s.unloadAsync();
          return;
        }

        setSound(s);

        // Grab duration after loading
        const st = await s.getStatusAsync();
        if ("durationMillis" in st && st.durationMillis != null) {
          setDurationMs(st.durationMillis);
        }
      } catch (e: any) {
        setError(`Audio failed to load: ${String(e?.message || e)}`);
      } finally {
        if (mounted) setIsLoadingAudio(false);
      }
    })();

    return () => {
      mounted = false;
      // Clean up sound on unmount
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, []);

  /** ===== Fetch lyrics from Gemini ===== */
  useEffect(() => {
    // Skip if lyrics are already loaded from params
    if (lyrics && lyrics.length > 0) {
      setIsLoadingLyrics(false);
      return;
    }

  let cancelled = false;

  (async () => {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Missing Gemini API key.");
      }

      setIsLoadingLyrics(true);
      setError(null);

      const prompt = buildGeminiPrompt(title, artist);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      const raw =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
        "";

      const jsonText = extractFirstJsonObject(raw);
      const parsed = JSON.parse(jsonText) as LyricsPayload;

      if (!cancelled && Array.isArray(parsed.lines)) {
        setLyrics(parsed.lines);
      }

    } catch (e: any) {
      setError(`Lyrics fetch failed: ${String(e?.message || e)}`);
    } finally {
      if (!cancelled) setIsLoadingLyrics(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [title, artist, lyrics]);

  /** ===== Playback status listener ===== */
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatusSuccess | any) => {
      if (!status || !("isLoaded" in status) || !status.isLoaded) return;

      setIsPlaying(status.isPlaying);
      if ("positionMillis" in status && typeof status.positionMillis === "number") {
        setPositionMs(status.positionMillis);
      }
      if (
        "durationMillis" in status &&
        typeof status.durationMillis === "number" &&
        status.durationMillis !== durationMs
      ) {
        setDurationMs(status.durationMillis);
      }

      // Auto-scroll when the highlighted line changes
      if (lyrics && msPerLine) {
        const idx = Math.floor((status.positionMillis || 0) / msPerLine);
        if (idx !== lastAutoScrollIndex.current) {
          lastAutoScrollIndex.current = idx;
          listRef.current?.scrollToIndex({
            index: Math.max(0, Math.min(lyrics.length - 1, idx)),
            animated: true,
            viewPosition: 0.3, // keep the line a bit above center
          });
        }
      }
    },
    [lyrics, msPerLine, durationMs]
  );

  /** ===== Controls ===== */
  const togglePlay = useCallback(async () => {
    try {
      if (!sound) return;
      const st = await sound.getStatusAsync();
      if (st.isLoaded && st.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (e: any) {
      Alert.alert("Playback error", String(e?.message || e));
    }
  }, [sound]);

  const stopAndReset = useCallback(async () => {
    try {
      if (!sound) return;
      await sound.stopAsync();
      await sound.setPositionAsync(0);
    } catch (e) {
      // ignore
    }
  }, [sound]);

  const seekToLine = useCallback(
    async (lineIndex: number) => {
      if (!sound || !msPerLine) return;
      const target = Math.floor(lineIndex * msPerLine);
      try {
        await sound.setPositionAsync(target);
        // Optional: if paused, start playing when the user taps a line
        const st = await sound.getStatusAsync();
        if (st.isLoaded && !st.isPlaying) await sound.playAsync();
      } catch (e) {
        // ignore
      }
    },
    [sound, msPerLine]
  );

  /** ===== Render ===== */
  const header = (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{artist}</Text>

      <View style={styles.controlsRow}>
        <Pressable style={styles.controlBtn} onPress={togglePlay}>
          <Text style={styles.controlBtnText}>{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={stopAndReset}>
          <Text style={styles.secondaryBtnText}>Stop</Text>
        </Pressable>
      </View>

      {durationMs != null && (
        <Text style={styles.timing}>
          {formatMs(positionMs)} / {formatMs(durationMs)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {header}

      {(isLoadingAudio || isLoadingLyrics) && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            {isLoadingAudio ? "Loading audio..." : "Fetching lyrics..."}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!!lyrics && lyrics.length > 0 && (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.listContent}
          data={lyrics}
          keyExtractor={(_, i) => String(i)}
          initialNumToRender={20}
          getItemLayout={(_, index) => ({
            length: LINE_HEIGHT,
            offset: LINE_HEIGHT * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const isActive = index === currentIndex;
            return (
              <Pressable onPress={() => seekToLine(index)} style={styles.linePressable}>
                <View style={[styles.lineBox, isActive && styles.activeLineBox]}>
                  <Text
                    style={[styles.lyricEn, isActive && styles.activeLyricEn]}
                    selectable={false}
                  >
                    {item.english}
                  </Text>
                  <Text
                    style={[styles.lyricHe, isActive && styles.activeLyricHe]}
                    selectable={false}
                  >
                    {item.hebrew}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

/** ===== Helpers ===== */

/** Builds the prompt for the Gemini API */
function buildGeminiPrompt(title: string, artist: string) {
  return (
    `Return the full lyrics of the song as strict JSON only.\n` +
    `Rules:\n` +
    `- Translate each English line to Hebrew, line by line, in order.\n` +
    `- Preserve punctuation, capitalization, repeated sections, and sounds like "Oooh" or "Na na".\n` +
    `- Skip empty lines.\n` +
    `- If lyrics are unavailable, return { "error": "unavailable" }.\n` +
    `Song: ${title}\n` +
    `Artist: ${artist}\n` +
    `Output example:\n` +
    `{\n` +
    `  "lines": [\n` +
    `    { "english": "You're on the phone with your girlfriend, she's upset", "hebrew": "אתה מדבר בטלפון עם החברה שלך, והיא נסערת" }\n` +
    `  ]}\n`
  );
}

/**
 * Extracts the first {...} JSON object from a text block.
 * We asked for strict JSON, but this guards against accidental wrappers.
 */
function extractFirstJsonObject(s: string): string {
  if (!s) throw new Error("Empty response text from Gemini.");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Gemini output.");
  }
  return s.slice(start, end + 1);
}

/** Pretty mm:ss formatter */
function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** ===== Styles ===== */
const LINE_HEIGHT = 64;

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  activeBg: "#E6FAF7",
  activeText: "#0F766E",
  border: "#e9ecef",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.select({ ios: 16, android: 8 }),
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textDim,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    alignItems: "center",
  },
  controlBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  controlBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  timing: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textDim,
  },
  loadingBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: COLORS.textDim,
  },
  errorBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: "#b00020",
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  linePressable: {
    borderRadius: 14,
    overflow: "hidden",
  },
  lineBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    minHeight: LINE_HEIGHT - 8,
    justifyContent: "center",
  },
  activeLineBox: {
    backgroundColor: COLORS.activeBg,
    borderColor: COLORS.primary,
  },
  lyricEn: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  lyricHe: {
    fontSize: 15,
    color: COLORS.textDim,
  },
  activeLyricEn: {
    color: COLORS.activeText,
  },
  activeLyricHe: {
    color: COLORS.activeText,
  },
});