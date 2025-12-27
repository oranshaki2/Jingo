import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function FinishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ correctWords?: string; incorrectWords?: string; userId?: string }>;
  
  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (params.correctWords) {
        setCorrectWords(JSON.parse(params.correctWords));
      }
      if (params.incorrectWords) {
        setIncorrectWords(JSON.parse(params.incorrectWords));
      }
    } catch (e) {
      console.error("Failed to parse results:", e);
    }
  }, [params.correctWords, params.incorrectWords]);

  const handleNavigateToSuggestions = () => {
    // Navigate to songs suggestions screen with userId
    router.push({
      pathname: "/songs/songs-suggestions",
      params: { userId: params.userId },
    });
  };

  const totalWords = correctWords.length + incorrectWords.length;
  const successRate = totalWords > 0 ? Math.round((correctWords.length / totalWords) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>

        <Text style={styles.title}>סיימנו!</Text>
        
        <Text style={styles.message}>
          כל הכבוד! השלמת בהצלחה את כל השאלות.
        </Text>

        {/* Summary Stats */}
        <View style={styles.summaryBox}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>סה״כ מילים:</Text>
            <Text style={styles.statValue}>{totalWords}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>שיעור הצלחה:</Text>
            <Text style={[styles.statValue, styles.successColor]}>{successRate}%</Text>
          </View>
        </View>

        {/* Correct Answers */}
        {correctWords.length > 0 && (
          <View style={styles.resultBox}>
            <Text style={[styles.resultTitle, styles.successText]}>✓ הצלחות ({correctWords.length})</Text>
            <View style={styles.wordsList}>
              {correctWords.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={[styles.wordText, styles.successText]}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Incorrect Answers */}
        {incorrectWords.length > 0 && (
          <View style={styles.resultBox}>
            <Text style={[styles.resultTitle, styles.errorText]}>✗ טעויות ({incorrectWords.length})</Text>
            <View style={styles.wordsList}>
              {incorrectWords.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={[styles.wordText, styles.errorText]}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleNavigateToSuggestions}
        >
          <Text style={styles.buttonText}>המשך</Text>
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
  error: "#EF4444",
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
  celebrationBox: {
    marginBottom: 24,
    alignItems: "center",
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
  summaryBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 20,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
    color: COLORS.textDim,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  successColor: {
    color: COLORS.success,
  },
  resultBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  successText: {
    color: COLORS.success,
  },
  errorText: {
    color: COLORS.error,
  },
  wordsList: {
    gap: 8,
  },
  wordItem: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  wordText: {
    fontSize: 14,
    fontWeight: "500",
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
