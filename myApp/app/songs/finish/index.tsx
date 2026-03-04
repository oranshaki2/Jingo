import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { artistImages } from "@/assets/artistsMap";
import styles from "./_styles";


const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function FinishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{
    correctWords?: string;
    incorrectWords?: string;
    userId?: string;
    songId?: string;
  }>;

  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);
  const historyPostedRef = React.useRef(false);

  useEffect(() => {
    try {
      if (params.correctWords) {
        setCorrectWords(JSON.parse(params.correctWords));
      }
      if (params.incorrectWords) {
        setIncorrectWords(JSON.parse(params.incorrectWords));
      }
    } catch (e) {
      console.error("Failed to parse results:", e);
    }
  }, [params.correctWords, params.incorrectWords]);

  // Add song to favorites when user completes the song
  useEffect(() => {
    const addToFavorites = async () => {
      if (!params.songId) return;

      try {
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");

        if (!userId || !token) {
          console.warn("[favorites] Missing user credentials");
          return;
        }

        const res = await fetch(`${API_URL}/users/${userId}/favorites`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ songId: params.songId }),
        });

        if (!res.ok) {
          console.warn(`[favorites] Failed to add song: ${res.status}`);
        }
      } catch (e) {
        console.warn("[favorites] Error adding to favorites:", e);
      }
    };

    addToFavorites();
  }, [params.songId]);

  // Store song metadata with artist key when user completes the song
  useEffect(() => {
    const storeSongMeta = async () => {
      if (!params.songId) return;

      try {
        const res = await fetch(`${API_URL}/songs/${params.songId}`);
        if (!res.ok) return;

        const song = await res.json();
        let displayPicture: string | null = null;
        if (song.artist) {
          const artistKey = extractArtistKey(song.artist);
          if (artistKey && artistImages[artistKey]) {
            displayPicture = artistKey;
          }
        }

        const metaTitle = song.title ?? song.name ?? "";
        const metaArtist = song.artist ?? song.performer ?? "";

        await AsyncStorage.setItem(
          `@songMeta/${params.songId}`,
          JSON.stringify({
            id: params.songId,
            title: metaTitle,
            artist: metaArtist,
            genre: song.genre ?? undefined,
            picture: displayPicture ?? null,
          })
        );

        if (song.lyrics) {
          const lyricsStr =
            typeof song.lyrics === "string"
              ? song.lyrics
              : JSON.stringify(song.lyrics);
          await AsyncStorage.setItem(`@lyrics/${params.songId}`, lyricsStr);
        }
      } catch (e) {
        console.warn("[finish] failed to store song meta", e);
      }
    };

    storeSongMeta();
  }, [params.songId]);

  // Post word history once on finish
  useEffect(() => {
    const postHistory = async () => {
      if (historyPostedRef.current) return;

      try {
        const API = API_URL;
        if (!API) return;

        const userId = await SecureStore.getItemAsync("user_id");
        if (!userId) return;

        const res = await fetch(`${API}/users/${userId}/history`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correctWords: correctWords ?? [],
            mistakenWords: incorrectWords ?? [],
          }),
        });

        if (!res.ok) {
          console.warn(`[history] Failed to save progress: ${res.status}`);
        } else {
          historyPostedRef.current = true;
        }
      } catch (e) {
        console.warn("[history] Error posting progress:", e);
      }
    };

    // Trigger when we have arrays (including empty) after parsing params
    if (correctWords !== undefined && incorrectWords !== undefined) {
      postHistory();
    }
  }, [correctWords, incorrectWords]);

  const handleNavigateToSuggestions = () => {
    // Navigate to songs suggestions screen with userId
    router.push({
      pathname: "/songs/songs-suggestions",
      params: { userId: params.userId, songId: params.songId },
    });
  };

  const extractArtistKey = (artist?: string): string | null => {
    if (!artist) return null;
    return String(artist)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");
  };

  const totalWords = correctWords.length + incorrectWords.length;
  const successRate =
    totalWords > 0 ? Math.round((correctWords.length / totalWords) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>

        <Text style={styles.title}>סיימנו!</Text>

        <Text style={styles.message}>כל הכבוד! השלמת בהצלחה את כל השאלות.</Text>

        <View style={styles.summaryBox}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>סה״כ מילים:</Text>
            <Text style={styles.statValue}>{totalWords}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>שיעור הצלחה:</Text>
            <Text style={[styles.statValue, styles.successColor]}>
              {successRate}%
            </Text>
          </View>
        </View>

        {correctWords.length > 0 && (
          <View style={styles.resultBox}>
            <Text style={[styles.resultTitle, styles.successText]}>
              ✓ הצלחות ({correctWords.length})
            </Text>
            <View style={styles.wordsList}>
              {correctWords.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={[styles.wordText, styles.successText]}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {incorrectWords.length > 0 && (
          <View style={styles.resultBox}>
            <Text style={[styles.resultTitle, styles.errorText]}>
              ✗ טעויות ({incorrectWords.length})
            </Text>
            <View style={styles.wordsList}>
              {incorrectWords.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={[styles.wordText, styles.errorText]}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.backButton}
          onPress={handleNavigateToSuggestions}
        >
          <Text style={styles.buttonText}>המשך</Text>
        </Pressable>
      </View>
    </View>
  );
}
