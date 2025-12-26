// app/(auth)/sign-up.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router, Href } from "expo-router";
import { saveSignupData } from "../../../utils/storage";
import styles, { COLORS } from "./_styles";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // check username availability
  const isUsernameTaken = async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `${API_URL}/users/by-username/${encodeURIComponent(name.trim())}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 404) return false; 
      if (res.ok) return true;              

      Alert.alert("שגיאה", "לא ניתן לבדוק זמינות שם משתמש כרגע. נסו שוב בעוד רגע.");
      return true; 
    } catch {
      Alert.alert("שגיאה", "בעיה בחיבור לשרת. נסו שוב מאוחר יותר.");
      return true;
    }
  };

  

  

  const onSubmit = async () => {
    if (!username.trim()) {
      Alert.alert("שגיאה", "יש להזין שם משתמש.");
      return;
    }
    if (!password) {
      Alert.alert("שגיאה", "יש להזין סיסמה.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("שגיאה", "הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("שגיאה", "הסיסמאות אינן תואמות.");
      return;
    }

    const taken = await isUsernameTaken(username);
    if (taken) {
      Alert.alert("שגיאה", "השם משתמש תפוס. בחר/י שם משתמש אחר.");
      return;
    }

    try {
      setSubmitting(true);
      await saveSignupData("username", username.trim());
      await saveSignupData("password", password);
      router.push("/(auth)/sign-up-difficulty" as Href);
    } catch {
      Alert.alert("שגיאה", "אירעה תקלה בהרשמה. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הירשמו והתחילו ללמוד היום!</Text>

      <View style={styles.field}>
        <Text style={styles.label}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י שם משתמש"
          placeholderTextColor="#7A7A7A"
          value={username}
          onChangeText={setUsername}
          textAlign="right"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>סיסמה</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י סיסמה (לפחות 8 תווים)"
          placeholderTextColor="#7A7A7A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>וידוא סיסמה</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י שוב את הסיסמה"
          placeholderTextColor="#7A7A7A"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          textAlign="right"
        />
      </View>

      {/* Profile picture upload removed */}

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { opacity: 0.92 },
          submitting && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="המשך"
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "נרשם/ת..." : "המשך"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/(auth)/sign-in" as Href)}
        style={styles.linkWrapper}
        accessibilityRole="link"
        accessibilityLabel="מעבר לעמוד התחברות"
      >
        <Text style={styles.linkText}>
          כבר רשומים? <Text style={styles.linkEmph}>לחצו כאן להתחברות</Text>
        </Text>
      </Pressable>
    </View>
  );
}
