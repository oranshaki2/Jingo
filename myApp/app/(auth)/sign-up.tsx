import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, Alert, StyleSheet, I18nManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { saveSignupData } from "../../utils/storage";

const COLORS = {
  primary: "#4EC4C4",      
  secondary: "#1A3D5A",    
  bgLight: "#F5F7F9",      
  textDark: "#333333",     
  accent: "#A8E6CF",      
};

const API_URL = process.env.EXPO_PUBLIC_API_URL!;


export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [picture, setPicture] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // check username availability
  const isUsernameTaken = async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/by-username/${encodeURIComponent(name.trim())}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 404) {
        // 404 Not Found 
        return false;
      }
      // 200 OK - username taken
      if (res.ok) return true;

      // Server/intermediate error - treat as failed check
      Alert.alert("שגיאה", "לא ניתן לבדוק זמינות שם משתמש כרגע. נסו שוב בעוד רגע.");
      return true; // Block registration until clarified
    } catch {
      Alert.alert("שגיאה", "בעיה בחיבור לשרת. נסו שוב מאוחר יותר.");
      return true; // Block registration until clarified
    }
  };
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("הרשאה נחוצה", "יש לאשר גישה לגלריה כדי להעלות תמונה.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setPicture(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("הרשאה נחוצה", "יש לאשר גישה למצלמה כדי לצלם תמונת פרופיל.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPicture(result.assets[0].uri);
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
      await saveSignupData("picture", picture ?? null);
      // move to next sign-up step
      router.push("/(auth)/sign-up-difficulty");
    } catch (e) {
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

      <View style={[styles.field, { marginTop: 8 }]}>
        <Text style={styles.label}>תמונת פרופיל (לא חובה)</Text>
        {picture ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: picture }} style={styles.avatar} />
            <Pressable onPress={() => setPicture(null)} style={styles.clearThumb}>
              <Text style={styles.clearThumbText}>הסר תמונה</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.imageButtonsRow}>
            <Pressable onPress={pickFromGallery} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>בחר/י מהגלריה</Text>
            </Pressable>
            <Pressable onPress={takePhoto} style={styles.secondaryButtonOutline}>
              <Text style={styles.secondaryButtonOutlineText}>צלם/י מהמצלמה</Text>
            </Pressable>
          </View>
        )}
      </View>

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
        <Text style={styles.primaryButtonText}>{submitting ? "נרשם/ת..." : "המשך"}</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/(auth)/sign-in")}
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
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  secondaryButtonOutlineText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFF",
  },
  clearThumb: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  clearThumbText: {
    color: COLORS.secondary,
    fontWeight: "600",
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