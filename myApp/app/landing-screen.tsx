import React from "react";
import { View, Text, Image, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",       // טורקיז־כחלחל
  secondary: "#1A3D5A",     // כחול נייבי כהה
  bgLight: "#F5F7F9",       // אפור־לבן רך
  textDark: "#333333",      // אפור כהה
  accent: "#A8E6CF",        // ירקרק ליים רך
};

export default function Landing() {
  const goSignIn = () => router.push("/(auth)/sign-in");
  const goSignUp = () => router.push("/(auth)/sign-up");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>ברוכים הבאים</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroText}>מרחב פרטי ללמידת אנגלית</Text>
          <Text style={styles.heroText}>בעזרת שירים.</Text>
        </View>

        <View style={styles.buttons}>
          <Pressable onPress={goSignIn} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}>
            <Text style={styles.btnPrimaryText}>התחברות</Text>
          </Pressable>

          <Pressable onPress={goSignUp} style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.92 }]}>
            <Text style={styles.btnGhostText}>הרשמה</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 32,
  },
  logo: {
    width: 480,
    height: 260,
    // marginTop: 0,
  },
  title: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: "700",
    // marginTop: 8,
  },
  heroCard: {
    width: "100%",
    backgroundColor: COLORS.secondary,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 2,
  },
  heroText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },
  buttons: {
    width: "100%",
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnGhost: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  btnGhostText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
});