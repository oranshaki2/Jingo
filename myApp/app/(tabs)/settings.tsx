import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import * as SecureStore from "expo-secure-store";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function Settings() {
  const [userData, setUserData] = useState<null | { username: string; level: number; genres: string[] }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");
        console.log("USER ID:", userId);
        console.log("TOKEN:", token);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textDark }}>לא נמצאו נתונים</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 28 }} /> {/* עמודת ריק לשם סימטריה */}
        <Text style={styles.title}>הגדרות</Text>
        <Image
          source={require("../../assets/icons/settings-gear.png")}
          style={styles.icon}
        />
      </View>


      <View style={styles.infoBox}>
        <Text style={styles.label}>שם משתמש:</Text>
        <Text style={styles.value}>{userData.username}</Text>

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

        <Text style={styles.label}>ז'אנרים מועדפים:</Text>
        <Text style={styles.value}>{userData.genres.join(", ")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: COLORS.bgLight,
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse", // גלגל שיניים בצד ימין
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  icon: {
    width: 28,
    height: 28,
    marginLeft: 12,
    tintColor: COLORS.secondary,
  },
  title: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: "bold",
    textAlign: "center", // אם יש צורך
  },
  infoBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "flex-end", // מיישר את התוכן כולו לימין
  },
  label: {
    color: COLORS.secondary,
    fontWeight: "bold",
    marginTop: 12,
    fontSize: 16,
    textAlign: "right", // טקסט מיושר לימין
    alignSelf: "stretch", // לוודא שהטקסט תופס את כל השורה
  },
  value: {
    color: COLORS.textDark,
    fontSize: 16,
    marginTop: 4,
    textAlign: "right", // טקסט מיושר לימין
    alignSelf: "stretch", // חשוב להצמדה לימין
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },
});

