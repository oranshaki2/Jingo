// app/(auth)/sign-in/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { router, Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import styles, { COLORS } from "./_styles";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!username.trim() || !password) {
      Alert.alert("שגיאה", "יש למלא את כל השדות.");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`${API_URL}/tokens`, {
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
      if (user?.username)
        await SecureStore.setItemAsync("username", user.username);

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
          autoCapitalize="none"
          textAlign="right"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>סיסמה</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="הקלד/י סיסמה"
            placeholderTextColor="#7A7A7A"
            value={password}
            onChangeText={setPassword}
            textAlign="right"
            secureTextEntry={isPasswordHidden}
          />

          <TouchableOpacity
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Image
              source={
                isPasswordHidden
                  ? require("@/assets/images/eyeHide.png")
                  : require("@/assets/images/eyeShow.png")
              }
              style={styles.eyeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { opacity: 0.9 },
          submitting && { opacity: 0.6 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>התחבר/י</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push("/(auth)/sign-up" as Href)}
        style={styles.linkWrapper}
      >
        <Text style={styles.linkText}>
          אין לך חשבון? <Text style={styles.linkEmph}>הרשם/י עכשיו</Text>
        </Text>
      </Pressable>
    </View>
  );
}
