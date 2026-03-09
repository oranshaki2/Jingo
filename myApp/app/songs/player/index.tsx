// app/songs/player/index.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { audioMap } from "@/assets/audioMap";
import styles, { LINE_HEIGHT } from "./_styles";

/**
 * ===== How this page works =====
 * 1) Loads a local audio file (your MP3) and prepares the player.
 * 2) Loads real timestamps from data/timestamps (as JSON files converted from LRC).
 *    If timestamps are unavailable, falls back to Gemini API or evenly distributes duration.
 * 3) Computes sync using real timestamps, or estimates by dividing total audio duration
 *    by number of lines if timestamps are missing.
 * 4) Highlights/scrolls to the current line during playback.
 * 5) Tapping a line seeks the audio to that line's actual (or estimated) start time.
 *
 * Timestamps are passed through params from the parent screen, or loaded from bundled
 * JSON files in myApp/assets/timestamps/. Format: { timestamps: [0, 2400, 4800, ...] }
 */

/** ===== Types ===== */
type LyricLine = { english: string; hebrew: string; startTimeMs?: number };
type LyricsPayload = {
  lines: LyricLine[];
};
type TimestampsData = {
  timestamps: number[];
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
  const router = useRouter();

  // useLocalSearchParams has a generic constraint 'Route' — cast the result instead of passing a generic.

  const params = useLocalSearchParams() as Partial<{
    title: string;
    artist: string;
    lyrics: string;
    timestamps?: string;
    song: string;
    category: string;
    level: string;
    userId: string;
    songId: string;
  }>;

  const title = params?.title || "Unknown Song";
  const artist = params?.artist || "Unknown Artist";
  const initialLyrics = params?.lyrics ?? "";
  const userId = params?.userId;

  // Normalize title for file naming (lowercase, no extra spaces)
  const normalizedTitle = title.trim().toLowerCase();

  const LOCAL_AUDIO =
    audioMap[normalizedTitle] ?? audioMap["you belong with me"];

  if (!audioMap[normalizedTitle]) {
    console.warn(`Audio not found for "${normalizedTitle}", using fallback.`);
  }

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [words, setWords] = useState<string[]>([]);

  const [lyrics, setLyrics] = useState<LyricLine[] | null>(() => {
    if (!initialLyrics) return null;
    try {
      return JSON.parse(initialLyrics);
    } catch (e) {
      console.warn("Failed to parse initialLyrics:", e);
      return null;
    }
  });
  const [timestamps, setTimestamps] = useState<number[] | null>(() => {
    if (!params.timestamps) return null;
    try {
      const parsed = JSON.parse(params.timestamps) as TimestampsData;
      return parsed.timestamps || null;
    } catch (e) {
      console.warn("Failed to parse timestamps:", e);
      return null;
    }
  });
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(!initialLyrics);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<FlatList<LyricLine>>(null);
  const lastAutoScrollIndex = useRef<number>(-1);
  const songId = String(params.song ?? "").trim();

  /** ===== Load words from AsyncStorage ===== */
  useEffect(() => {
    let mounted = true;

    async function loadWords() {
      try {
        const wordsRaw = await AsyncStorage.getItem(`@newWords/${songId}`);
        const wordsParsed = wordsRaw ? (JSON.parse(wordsRaw) as string[]) : [];
        if (mounted) {
          setWords(Array.isArray(wordsParsed) ? wordsParsed : []);
        }
      } catch (e) {
        console.warn("[player] failed to load words from storage:", e);
        if (mounted) {
          setWords([]);
        }
      }
    }

    if (songId) loadWords();
    return () => {
      mounted = false;
    };
  }, [songId]);

  /** ====== Derived sync helpers ======
   * Uses real timestamps if available, otherwise falls back to evenly distributed timing.
   * With timestamps: find the line where positionMs falls.
   * Without timestamps: divide totalDuration by lineCount and estimate.
   */
  const msPerLine = useMemo(() => {
    // Only compute fallback if we don't have real timestamps
    if (timestamps && timestamps.length > 0) return null;
    if (!durationMs || !lyrics || lyrics.length === 0) return null;
    return durationMs / lyrics.length;
  }, [durationMs, lyrics, timestamps]);

  const currentIndex = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return 0;

    // If we have real timestamps, use them
    if (timestamps && timestamps.length > 0) {
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (positionMs >= timestamps[i]) {
          return i;
        }
      }
      return 0;
    }

    // Fallback: evenly distribute duration across lines
    if (!msPerLine) return 0;
    const idx = Math.floor(positionMs / msPerLine);
    return Math.max(0, Math.min(lyrics.length - 1, idx));
  }, [positionMs, msPerLine, lyrics, timestamps]);

  const isFocused = useIsFocused();

  /** ===== Load audio when screen is focused ===== */
  useEffect(() => {
    let mounted = true;

    // Only initialize when the screen is focused and we don't already have a sound
    if (!isFocused || soundRef.current) return;

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
          onPlaybackStatusUpdate,
        );

        if (!mounted) {
          await s.unloadAsync();
          return;
        }

        setSound(s);
        soundRef.current = s;

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
      // If the screen is blurring/unmounting and we have a sound, unload it
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
    // Re-run when focus changes or the audio source changes
  }, [isFocused, LOCAL_AUDIO]);

  // Ensure audio stops, resets to start, and unloads when the component unmounts
  useEffect(() => {
    return () => {
      if (!soundRef.current) return;
      (async () => {
        try {
          const s = soundRef.current!;
          const st = await s.getStatusAsync();
          if (st.isLoaded) {
            // stop playback and reset to start
            await s.stopAsync().catch(() => {});
            await s.setPositionAsync(0).catch(() => {});
          }
          await s.unloadAsync().catch(() => {});
        } catch (e) {
          // ignore
        } finally {
          soundRef.current = null;
        }
      })();
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
          },
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
      if (
        "positionMillis" in status &&
        typeof status.positionMillis === "number"
      ) {
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
      if (lyrics) {
        const idx = currentIndex; // Use the memoized currentIndex calculation
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
    [lyrics, currentIndex, durationMs],
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
      if (!sound || !lyrics || !lyrics[lineIndex]) return;

      // Determine target position: use real timestamp if available, otherwise estimate
      let target = 0;
      if (timestamps && timestamps.length > lineIndex) {
        target = timestamps[lineIndex];
      } else if (msPerLine) {
        target = Math.floor(lineIndex * msPerLine);
      } else {
        return; // Can't seek without either timestamps or msPerLine
      }

      try {
        await sound.setPositionAsync(target);
        // Optional: if paused, start playing when the user taps a line
        const st = await sound.getStatusAsync();
        if (st.isLoaded && !st.isPlaying) await sound.playAsync();
      } catch (e) {
        // ignore
      }
    },
    [sound, lyrics, msPerLine, timestamps],
  );

  const startStudy = useCallback(async () => {
    if (words.length === 0) {
      Alert.alert("No words", "Please ensure words are saved in AsyncStorage.");
      return;
    }

    // Stop, reset and unload the audio before navigating away
    try {
      if (soundRef.current) {
        const s = soundRef.current;
        const st = await s.getStatusAsync().catch(() => ({}) as any);
        if (st && st.isLoaded) {
          await s.stopAsync().catch(() => {});
          await s.setPositionAsync(0).catch(() => {});
        }
        await s.unloadAsync().catch(() => {});
      }
    } catch (e) {
      // ignore cleanup errors
    } finally {
      setSound(null);
      soundRef.current = null;
    }

    // Navigate to Question1 with words as parameter
    router.push({
      pathname: "/songs/question1",
      params: {
        words: JSON.stringify(words),
        category: params.category || "",
        level: params.level || 1,
        userId,
        songId,
      },
    });
  }, [words, router, params.category, params.level, userId]);

  /** ===== Render ===== */
  const header = (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{artist}</Text>

      <View style={styles.controlsRow}>
        <Pressable style={styles.controlBtn} onPress={togglePlay}>
          <Text style={styles.controlBtnText}>
            {isPlaying ? "השהה" : "נגן"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={stopAndReset}>
          <Text style={styles.secondaryBtnText}>עצור</Text>
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
            {isLoadingAudio ? "טוען שמע..." : "טוען מילים..."}
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
              <Pressable
                onPress={() => seekToLine(index)}
                style={styles.linePressable}
              >
                <View
                  style={[styles.lineBox, isActive && styles.activeLineBox]}
                >
                  <Text selectable={false}>
                    {renderHighlightedParts(
                      item.english,
                      words,
                      styles.lyricEn,
                      styles.activeLyricEn,
                      styles.highlightWord,
                      isActive,
                    )}
                  </Text>

                  <Text selectable={false}>
                    {renderHighlightedParts(
                      item.hebrew,
                      words,
                      styles.lyricHe,
                      styles.activeLyricHe,
                      styles.highlightWord,
                      isActive,
                    )}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Study Start Button at Bottom-Right */}
      <Pressable style={styles.studyButton} onPress={startStudy}>
        <Text style={styles.studyButtonText}>התחל לימוד</Text>
      </Pressable>
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

/** Escape for safe regex usage */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Render a text string with parts that match any of `highlights` wrapped
 * in a Text node with `highlightStyle`. Returns an array of <Text/> nodes.
 */
function renderHighlightedParts(
  text: string | undefined,
  highlights: string[],
  baseStyle: any,
  activeStyle: any,
  highlightStyle: any,
  isActive: boolean,
) {
  if (!text) return null;

  if (!highlights || highlights.length === 0) {
    return <Text style={[baseStyle, isActive && activeStyle]}>{text}</Text>;
  }

  const cleaned = highlights
    .filter(Boolean)
    .map((h) => escapeRegExp(h.trim()))
    .sort((a, b) => b.length - a.length);

  const pattern = cleaned.join("|");
  if (!pattern)
    return <Text style={[baseStyle, isActive && activeStyle]}>{text}</Text>;

  // Split while preserving matches via a global split pattern (we'll iterate)
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));

  return parts.map((part, idx) => {
    if (!part) return null;
    const isMatch = cleaned.some((e) => new RegExp(`^${e}$`, "i").test(part));
    const style = isMatch
      ? [baseStyle, isActive && activeStyle, highlightStyle]
      : [baseStyle, isActive && activeStyle];
    return (
      <Text key={String(idx)} style={style}>
        {part}
      </Text>
    );
  });
}
