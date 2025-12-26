import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Question3Screen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ remainingWords: string }>;
  
  const [words, setWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (params.remainingWords) {
        const parsedWords = JSON.parse(params.remainingWords);
        if (Array.isArray(parsedWords) && parsedWords.length > 0) {
          setWords(parsedWords);
          // Select a random word as the current word
          const randomIndex = Math.floor(Math.random() * parsedWords.length);
          setCurrentWord(parsedWords[randomIndex]);
        } else {
          Alert.alert("Error", "No words received or words list is empty.");
        }
      }
    } catch (e) {
      console.error("Failed to parse remaining words:", e);
      Alert.alert("Error", "Failed to parse remaining words.");
    } finally {
      setIsLoading(false);
    }
  }, [params.remainingWords]);

  const handleComplete = () => {
    if (!currentWord) return;

    // Create remaining words array (original list minus the selected word)
    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      // Words remain, loop back to Question1 with remaining words
      router.push({
        pathname: "/songs/question1",
        params: {
          words: JSON.stringify(remainingWords),
        },
      });
    } else {
      // No remaining words, navigate to finish
      router.push("/songs/finish");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Question Type 3</Text>
        
        {currentWord && (
          <View style={styles.wordBox}>
            <Text style={styles.wordLabel}>Current Word:</Text>
            <Text style={styles.word}>{currentWord}</Text>
          </View>
        )}

        <View style={styles.questionBox}>
          <Text style={styles.questionTitle}>Dummy Question:</Text>
          <Text style={styles.questionText}>
            What is the meaning of "{currentWord}"?
          </Text>
        </View>

        <Text style={styles.description}>
          Answer this question to complete the cycle. If words remain, you'll start a new cycle with Question 1.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable style={styles.completeButton} onPress={handleComplete}>
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
  border: "#e9ecef",
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
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 32,
    textAlign: "center",
  },
  wordBox: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 24,
    width: "100%",
    marginBottom: 24,
    alignItems: "center",
  },
  wordLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDim,
    marginBottom: 8,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
  },
  questionBox: {
    backgroundColor: "#F0F8F8",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 16,
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDim,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  completeButton: {
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
  loadingText: {
    marginTop: 12,
    color: COLORS.textDim,
    fontSize: 16,
    textAlign: "center",
  },
});
