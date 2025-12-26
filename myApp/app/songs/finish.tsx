import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

export default function FinishScreen() {
  const router = useRouter();

  const handleBackToHome = () => {
    // Navigate back to home screen
    router.push("/(tabs)/home");
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>

        <Text style={styles.title}>Study Complete!</Text>
        
        <Text style={styles.message}>
          Great job! You've successfully completed all the questions for all the words.
        </Text>

        <View style={styles.statsBox}>
          <Text style={styles.statsText}>
            You've studied all the words in your list!
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.backButton} 
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
  success: "#10B981",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  celebrationBox: {
    marginBottom: 24,
  },
  celebrationEmoji: {
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
  statsBox: {
    backgroundColor: "#E6FAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 20,
    width: "100%",
  },
  statsText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  backButton: {
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
