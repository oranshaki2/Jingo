import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const COLORS = {
  primary: "#4EC4C4",       
  secondary: "#1A3D5A",   
  bgLight: "#F5F7F9",      
  textDark: "#333333",     
  accent: "#A8E6CF",        
};

const BASE_URL = "http://localhost:3000";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!username.trim() || !password) {
      Alert.alert("שגיאה", "יש למלא את כל השדות.");
      return;
    }

    setSubmitting(true);

    // Timeout if server doesn't respond in 10 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        // Try to get error message from server response
        let msg = "שם משתמש או סיסמה שגויים";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch (_) {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      const data = await res.json();
      // Store token securely
      const token: string | undefined = data?.token;
      const user = data?.user;

      if (!token) throw new Error("Token not found in server response");

      await SecureStore.setItemAsync("auth_token", token);
      // Save user ID for convenience
      if (user?.id) await SecureStore.setItemAsync("user_id", String(user.id));

      // Save username for convenience
      if (user?.username) await SecureStore.setItemAsync("username", user.username);

      // Navigate to home screen
      Alert.alert("הצלחה", "ההתחברות בוצעה בהצלחה!");
      router.replace("/(tabs)/home");
      
    } catch (err: any) {
      if (err?.name === "AbortError") {
        Alert.alert("תקלה", "בזמן ניסיון ההתחברות עבר זמן ההמתנה. נסו שוב.");
      } else {
        Alert.alert("שגיאה", err?.message || "נכשל בהתחברות. נסו שוב.");
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
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