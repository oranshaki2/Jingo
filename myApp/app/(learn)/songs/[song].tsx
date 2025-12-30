// app/songs/[song].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { artistImages } from "@/assets/artistsMap";
import { loadTimestampsAsset } from "@/utils/timestampsLoader"; 

const getImageSource = (picture?: string | null) => {
  if (!picture) return null;
  if (/^https?:\/\//.test(picture)) return { uri: picture };
  return artistImages[picture] ?? null;
};

/**
 * Load timestamps from bundled JSON files in assets/timestamps/
 * Normalizes song title to match the file naming convention
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

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  chipOn: "#CDEEDC",
  chipOff: "#E9E6E6",
  placeholderBg: "#DDF4F4",
};

type Params = {
  song?: string;
  userId?: string;        
};

type SongMeta = {
  title: string;
  artist: string;
  genre?: string;
  picture?: string | null;
};

export default function SongScreen() {
  const params = useLocalSearchParams<Params>();
  const songId = String(params.song ?? "").trim();
  const userId = params.userId;

  const [level, setLevel] = useState<number | null>(null);
  const [meta, setMeta] = useState<SongMeta | null>(null);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState<string>("");
  const [timestamps, setTimestamps] = useState<string>("");

  // ----- Load Data from AsyncStorage -----
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        // רמה מה-cache אם אין פרמטר
        const lvl = await AsyncStorage.getItem("user_level");
        if (mounted) setLevel(lvl ? Number(lvl) : null);

        // Meta
        const metaRaw = await AsyncStorage.getItem(`@songMeta/${songId}`);
        const metaParsed = metaRaw ? (JSON.parse(metaRaw) as SongMeta) : null;
        if (mounted) setMeta(metaParsed);

        // newWords
        const wordsRaw = await AsyncStorage.getItem(`@newWords/${songId}`);
        const wordsParsed = wordsRaw ? (JSON.parse(wordsRaw) as string[]) : [];
        if (mounted) setNewWords(Array.isArray(wordsParsed) ? wordsParsed : []);

        // lyrics (אופציונלי — אם תרצה להשתמש כאן)
        const lyr = (await AsyncStorage.getItem(`@lyrics/${songId}`)) || "";
        if (mounted) setLyrics(lyr || "");

        // timestamps - try to load from bundled JSON files
        // Format: { timestamps: [0, 2400, 4800, ...], lineCount: N }
        if (metaParsed?.title) {
          const tsString = loadTimestampsForSong(metaParsed.title);
          if (mounted) setTimestamps(tsString);
        }
      } catch (e) {
        console.warn("[song] failed to load storage:", e);
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
      mounted = false;
    };
  }, [songId]);

  // ----- Image Handling -----
  const imageSource = getImageSource(meta?.picture);
  const [showImage, setShowImage] = useState<boolean>(!!imageSource);
  useEffect(() => setShowImage(!!imageSource), [imageSource]);

  // Load Level for Display
  const levelLabel = useMemo(() => {
    if (level === 1) return "קל";
    if (level === 2) return "בינוני";
    if (level === 3) return "קשה";
    return "קל";
  }, [level]);
  const isActive = (key: "קל" | "בינוני" | "קשה") => levelLabel === key;

  // ----- Start Button Handler -----
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

      {/* רמות – ממורכז */}
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

        {/* כפתור התחל – ממורכז */}
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
