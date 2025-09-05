import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",       // טורקיז־כחלחל
  secondary: "#1A3D5A",     // כחול נייבי כהה
  bgLight: "#F5F7F9",       // אפור־לבן רך
  textDark: "#333333",      // אפור כהה
  accent: "#A8E6CF",        // ירקרק ליים רך
};

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = () => {
    // כאן אפשר לבצע ולידציה/קריאה ל-API. כרגע ניווט בלבד:
    router.replace("/(tabs)/home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>התחברות</Text>

      <View style={styles.field}>
        <Text style={styles.label}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י שם משתמש"
          placeholderTextColor="#7A7A7A"
          value={username}
          onChangeText={setUsername}
          textAlign="right"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>סיסמה</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י סיסמה"
          placeholderTextColor="#7A7A7A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />
      </View>

      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="התחבר"
      >
        <Text style={styles.primaryButtonText}>התחבר</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(auth)/sign-up")}
        style={styles.linkWrapper}
        accessibilityRole="link"
        accessibilityLabel="מעבר לעמוד הרשמה"
      >
        <Text style={styles.linkText}>
          לא רשומים עדיין? <Text style={styles.linkEmph}>לחצו כאן להרשמה</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    backgroundColor: COLORS.bgLight,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 24,
    textAlign: "right",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 6,
    textAlign: "right",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: COLORS.textDark,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  linkWrapper: {
    marginTop: 14,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.textDark,
    fontSize: 14,
  },
  linkEmph: {
    color: COLORS.accent,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});