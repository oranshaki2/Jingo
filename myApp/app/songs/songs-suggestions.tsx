import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SongsSuggestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ userId?: string }>;

  const handleBackToHome = () => {
    // Navigate back to home screen
    router.push("/(tabs)/home");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerBox}>
          <Text style={styles.headerEmoji}>💡</Text>
        </View>

        <Text style={styles.title}>עוד ממה שאתם אוהבים</Text>
        
        <Text style={styles.message}>
         הנה כמה הצעות לשירים נוספים שכדאי לנסות:
        </Text>

        <View style={styles.suggestionsBox}>
          <Text style={styles.suggestionsText}>
            תוכן הצעות יופיע כאן
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.homeButton} 
          onPress={handleBackToHome}
        >
          <Text style={styles.buttonText}>חזרה לעמוד הבית</Text>
        </Pressable>
      </View>
    </View>
  );
}

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  headerBox: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 32,
  },
  suggestionsBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  suggestionsText: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: "center",
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
