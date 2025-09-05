import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, Alert, StyleSheet, I18nManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",       // טורקיז־כחלחל
  secondary: "#1A3D5A",     // כחול נייבי כהה
  bgLight: "#F5F7F9",       // אפור־לבן רך
  textDark: "#333333",      // אפור כהה
  accent: "#A8E6CF",        // ירקרק ליים רך
};

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // וודא RTL
  if (!I18nManager.isRTL) {
    // לא משנה layout מידי, אבל נשמור על textAlign="right" בשדות
  }

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
      setImageUri(result.assets[0].uri);
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
      setImageUri(result.assets[0].uri);
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
    if (password !== confirm) {
      Alert.alert("שגיאה", "הסיסמאות אינן תואמות.");
      return;
    }

    try {
      setSubmitting(true);
      // במקום מעבר לבית: מעבר לעמוד בחירת הרמה
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
          placeholder="הקלד/י סיסמה"
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
        {imageUri ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: imageUri }} style={styles.avatar} />
            <Pressable onPress={() => setImageUri(null)} style={styles.clearThumb}>
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