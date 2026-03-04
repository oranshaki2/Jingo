import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { artistImages } from "@/assets/artistsMap";
import styles, { COLORS } from "./_styles";

type SuggestedSong = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
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

        const extractArtistKey = (artist?: string): string | null => {
          if (!artist) return null;
          return String(artist)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "_");
        };

        const processSongPicture = (song: any): SuggestedSong => {
          let displayPicture: string | null = null;
          if (song.artist) {
            const artistKey = extractArtistKey(song.artist);
            if (artistKey && artistImages[artistKey]) {
              displayPicture = artistKey;
            }
          }
          return {
            ...song,
            picture: displayPicture || song.picture || undefined,
          } as SuggestedSong;
        };

        if (ids && ids.length > 0) {
          const detailed = await Promise.all(
            ids.map(async (sId) => {
              try {
                const songRes = await fetch(`${API_URL}/songs/${sId}`);
                if (!songRes.ok) throw new Error();
                const songData = await songRes.json();
                return processSongPicture(songData);
              } catch {
                return { _id: sId, id: sId } as SuggestedSong;
              }
            })
          );
          setSuggestions(detailed);
        } else if (Array.isArray(data)) {
          setSuggestions(data.map(processSongPicture));
        } else if (Array.isArray(data?.songs)) {
          setSuggestions(data.songs.map(processSongPicture));
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

      let full = song;
      if (!song.title && !song.name) {
        try {
          const res = await fetch(`${API_URL}/songs/${songId}`);
          if (res.ok) full = (await res.json()) as SuggestedSong;
        } catch {}
      }

      const title = full.title || full.name || "Unknown";
      const artist = full.artist || "";
      const picture = full.picture || "";

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

      if (full.lyrics) {
        const lyricsStr =
          typeof full.lyrics === "string"
            ? full.lyrics
            : JSON.stringify(full.lyrics);
        await AsyncStorage.setItem(`@lyrics/${songId}`, lyricsStr);
      }

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

        <Text style={styles.message}>הנה כמה הצעות לשירים נוספים שכדאי לנסות:</Text>

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
                      source={
                        getImageSource(song.picture) || {
                          uri: song.picture || "",
                        }
                      }
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
