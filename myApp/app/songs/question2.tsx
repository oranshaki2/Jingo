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

export default function Question2Screen() {
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

  const handleContinue = () => {
    if (!currentWord) return;

    // Create remaining words array (original list minus the selected word)
    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      // Navigate to Question3 with remaining words
      router.push({
        pathname: "/songs/question3",
        params: {
          remainingWords: JSON.stringify(remainingWords),
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Question Type 2</Text>
        
        {currentWord && (
          <View style={styles.wordBox}>
            <Text style={styles.wordLabel}>Current Word:</Text>
            <Text style={styles.word}>{currentWord}</Text>
          </View>
        )}

        <Text style={styles.description}>
          This is Question Type 2. You will answer a different question about the word above.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable style={styles.continueButton} onPress={handleContinue}>
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
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 32,
  },
  wordBox: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 24,
    width: "100%",
    marginBottom: 32,
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
  description: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  continueButton: {
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
  },
});
