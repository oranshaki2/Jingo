import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const genreLabels: Record<string, string> = {
  rock: "רוק",
  pop: "פופ",
  rnb: "רית'ם אנד בלוז",
  hiphop: "היפ-הופ",
  metal: "מטאל",
  jazz: "ג'אז",
  folk: "פולק",
  electronic: "אלקטרוני",
  country: "קאנטרי",
  indie: "אינדי",
  kids: "ילדים",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function Settings() {
  const [userData, setUserData] = useState<null | {
    username: string;
    level: number;
    genres: string[];
  }>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (err: any) {
        Alert.alert("שגיאה", err.message || "אירעה שגיאה");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: COLORS.textDark }}>לא נמצאו נתונים</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>הגדרות</Text>
          <View style={styles.titleUnderline} />
          <Image
            source={require("../../assets/gif/head-moves.gif")}
            style={{ width: 100, height: 100 }}
          />
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.label}>שם משתמש:</Text>
          <Text style={styles.value}>{userData.username}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>רמת קושי:</Text>
          <Text style={styles.value}>
            {userData.level === 1
              ? "קל"
              : userData.level === 2
              ? "בינוני"
              : userData.level === 3
              ? "קשה"
              : userData.level}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>ז'אנרים מועדפים:</Text>
          <Text style={styles.value}>
            {userData.genres && userData.genres.length > 0
              ? userData.genres
                  .map((genre) => genreLabels[genre.toLowerCase()] || genre)
                  .join(", ")
              : "לא נבחרו ז'אנרים"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
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
  icon: {
    width: 36,
    height: 36,
    marginTop: 8,
    tintColor: COLORS.secondary,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E6EEF0",
    alignItems: "flex-end",
  },

  label: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: COLORS.textDark,
    textAlign: "right",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    alignSelf: "stretch",
    marginVertical: 12,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },
});