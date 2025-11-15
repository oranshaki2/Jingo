import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
// Reuse styles from the sign-up flow
const styles: any = {
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  wrap: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, alignItems: "stretch" },
  header: { alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  titleUnderline: { height: 4, width: 60, backgroundColor: "#2b8aef", marginTop: 4 },
  cards: { marginVertical: 8 },
  heading: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  primaryButton: {
    backgroundColor: "#2b8aef",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  COLORS: { primary: "#2b8aef", textDark: "#222" },
  GENRES: new Set(["rock", "pop", "jazz", "classical", "hiphop"]),
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

type GenreItem = { key: string; label?: string; title?: string } | string;

const local = StyleSheet.create({
  optionCard: {
    flexDirection: "row-reverse", // Align content to the right
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginVertical: 6,
    marginHorizontal: 4,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: "#2b8aef",
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 28,
    marginLeft: 10, // Adjust spacing for right alignment
  },
  optionText: {
    flexDirection: "column",
    alignItems: "flex-end", // Align text to the right
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  genreCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    margin: 6,
    alignSelf: "flex-end", // Align genre cards to the right
  },
  genreCardSelected: {
    backgroundColor: "#2b8aef",
  },
  genreText: {
    color: "#333",
    fontSize: 13,
    textAlign: "right", // Align text inside genre cards to the right
  },
  genreTextSelected: {
    color: "#fff",
  },
});

const OptionCard: React.FC<{
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}> = ({ emoji, title, subtitle, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        local.optionCard,
        selected && local.optionCardSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={local.emoji}>{emoji}</Text>
      <View style={local.optionText}>
        <Text style={local.optionTitle}>{title}</Text>
        <Text style={local.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

const GenreCard: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        local.genreCard,
        selected && local.genreCardSelected,
      ]}
    >
      <Text style={[local.genreText, selected && local.genreTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
};

const ALL_GENRES = [
  { key: "rock", label: "רוק" },
  { key: "pop", label: "פופ" },
  { key: "rnb", label: "רית'ם אנד בלוז" },
  { key: "hiphop", label: "היפ-הופ" },
  { key: "metal", label: "מטאל" },
  { key: "jazz", label: "ג'אז" },
  { key: "folk", label: "פולק" },
  { key: "electronic", label: "אלקטרוני" },
  { key: "country", label: "קאנטרי" },
  { key: "indie", label: "אינדי" },
  { key: "kids", label: "ילדים" },
];

export default function Settings() {
  const [userData, setUserData] = useState<null | {
    username: string;
    level: number;
    genres: string[];
  }>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");

        if (!userId || !token) {
          Alert.alert("שגיאה", "לא נמצאו פרטי משתמש.");
          return;
        }

        const res = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("נכשל לקבל את פרטי המשתמש");

        const data = await res.json();
        setUserData(data);
        setLevel(data.level);
        setSelectedGenres(new Set(data.genres));
      } catch (err: any) {
        Alert.alert("שגיאה", err.message || "אירעה שגיאה");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      next.has(genre) ? next.delete(genre) : next.add(genre);
      return next;
    });
  };

  const saveChanges = async () => {
    try {
      const userId = await SecureStore.getItemAsync("user_id");
      const token = await SecureStore.getItemAsync("auth_token");

      if (!userId || !token) {
        Alert.alert("שגיאה", "לא נמצאו פרטי משתמש.");
        return;
      }

      if (level !== null) {
        const levelRes = await fetch(`${API_URL}/users/${userId}/level`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ level }),
        });

        if (!levelRes.ok) throw new Error("עדכון רמת הקושי נכשל");
      }

      const genresRes = await fetch(`${API_URL}/users/${userId}/genres`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ genres: Array.from(selectedGenres) }),
      });

      if (!genresRes.ok) throw new Error("עדכון הז'אנרים נכשל");

      Alert.alert("הצלחה", "השינויים נשמרו בהצלחה.");
    } catch (err: any) {
      Alert.alert("שגיאה", err.message || "אירעה שגיאה");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={styles.COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: styles.COLORS.textDark }}>לא נמצאו נתונים</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>הגדרות</Text>
        <View style={styles.titleUnderline} />
        <Image
          source={require("../../assets/gif/head-moves.gif")}
          style={{ width: 100, height: 100 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Difficulty Selection */}
        <View style={styles.cards}>
          <OptionCard
            emoji="🟢"
            title="קל"
            subtitle="מתאים למתחילים"
            selected={level === 1}
            onPress={() => setLevel(1)}
          />
          <OptionCard
            emoji="🟡"
            title="בינוני"
            subtitle="עם קצת ניסיון"
            selected={level === 2}
            onPress={() => setLevel(2)}
          />
          <OptionCard
            emoji="🔴"
            title="קשה"
            subtitle="לרמה מתקדמת"
            selected={level === 3}
            onPress={() => setLevel(3)}
          />
        </View>

        {/* Genre Selection */}
        <Text style={[styles.heading, { textAlign: "center" }]}>ז'אנרים מועדפים</Text>
        <View style={[styles.row, { justifyContent: "center" }]}>
          {ALL_GENRES.map((genre) => (
            <GenreCard
              key={genre.key}
              label={genre.label}
              selected={selectedGenres.has(genre.key)}
              onPress={() => toggleGenre(genre.key)}
            />
          ))}
        </View>

        {/* Save Button */}
        <Pressable
          onPress={saveChanges}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="שמור שינויים"
        >
          <Text style={styles.primaryButtonText}>שמור שינויים</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}