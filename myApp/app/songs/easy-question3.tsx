import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import translationsHe from "@/assets/translations_he.json";



export default function Question3Screen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ remainingWords: string; category: string; level: string; correctWords?: string; incorrectWords?: string; userId?: string }>;
  
  const [words, setWords] = useState<string[]>([]);
  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Parse tracking lists if they exist
      if (params.correctWords) {
        setCorrectWords(JSON.parse(params.correctWords));
      }
      if (params.incorrectWords) {
        setIncorrectWords(JSON.parse(params.incorrectWords));
      }
    } catch (e) {
      console.error("Failed to parse remaining words:", e);
      Alert.alert("Error", "Failed to parse remaining words.");
    } finally {
      setIsLoading(false);
    }
  }, [params.remainingWords]);

  const handleCheck = () => {
    if (!userAnswer.trim()) {
      Alert.alert("שגיאה", "אנא הקלידו תשובה");
      return;
    }
    setIsChecked(true);
  };

  const handleContinue = () => {
    if (!currentWord) return;

    // Determine if answer is correct
    const isAnswerCorrect = userAnswer.trim().toLowerCase() === currentWord.toLowerCase();
    
    // Update tracking lists
    const newCorrectWords = isAnswerCorrect 
      ? [...correctWords, currentWord] 
      : correctWords;
    const newIncorrectWords = !isAnswerCorrect 
      ? [...incorrectWords, currentWord] 
      : incorrectWords;

    // Create remaining words array (original list minus the selected word)
    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      // Words remain, loop back to Question1 with remaining words
      router.push({
        pathname: "/songs/question1",
        params: {
          words: JSON.stringify(remainingWords),
          correctWords: JSON.stringify(newCorrectWords),
          incorrectWords: JSON.stringify(newIncorrectWords),
          category: params.category || "",
          level: params.level || "",
          userId: params.userId,
        },
      });
    } else {
      // Save progress to server before finishing
      saveProgressToServer(newCorrectWords, newIncorrectWords);
    }
  };

  const saveProgressToServer = async (correctWords: string[], mistakenWords: string[]) => {
    try {
      if (!params.userId) {
        console.warn("No userId found, skipping server update");
        navigateToFinish(correctWords, mistakenWords);
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        console.warn("API_URL not configured");
        navigateToFinish(correctWords, mistakenWords);
        return;
      }

      const response = await fetch(
        `${API_URL}/users/${params.userId}/history`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correctWords,
            mistakenWords,
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to save progress: ${response.status}`);
      }
    } catch (error) {
      console.error("Error saving progress to server:", error);
    } finally {
      // Always navigate to finish, regardless of server response
      navigateToFinish(correctWords, mistakenWords);
    }
  };

  const navigateToFinish = (correctWords: string[], mistakenWords: string[]) => {
    router.push({
      pathname: "/songs/finish",
      params: {
        correctWords: JSON.stringify(correctWords),
        incorrectWords: JSON.stringify(mistakenWords),
        userId: params.userId,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>

        {/* ===== Question Title ===== */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>מה פירוש המילה באנגלית?</Text>
        </View>

        {/* ===== Hebrew Translation ===== */}
        {currentWord && translationsHe[currentWord as keyof typeof translationsHe] && (
          <View style={styles.wordBox}>
            <Text style={styles.wordLabel}>המילה בעברית:</Text>
            <Text style={styles.word}>
              {translationsHe[currentWord as keyof typeof translationsHe]}
            </Text>
          </View>
        )}

        {/* ===== Text Input ===== */}
        {currentWord && (
          <>
            <TextInput
              style={[
                styles.textInput,
                isChecked && userAnswer.trim().toLowerCase() === currentWord.toLowerCase() && styles.correctInput,
                isChecked && userAnswer.trim().toLowerCase() !== currentWord.toLowerCase() && styles.wrongInput,
              ]}
              placeholder="הקלידו את התשובה באנגלית..."
              placeholderTextColor={COLORS.textDim}
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!isChecked}
            />

            {/* ===== Feedback Message ===== */}
            {isChecked && (
              <Text
                style={[
                  styles.feedbackText,
                  userAnswer.trim().toLowerCase() === currentWord.toLowerCase() && styles.correctFeedback,
                  userAnswer.trim().toLowerCase() !== currentWord.toLowerCase() && styles.wrongFeedback,
                ]}
              >
                {userAnswer.trim().toLowerCase() === currentWord.toLowerCase() 
                  ? "✓ תשובה נכונה!" 
                  : `✗ תשובה שגויה. התשובה הנכונה: ${currentWord}`}
              </Text>
            )}
          </>
        )}
      </View>

      {/* ===== Buttons ===== */}
      <View style={styles.buttonContainer}>
        {!isChecked ? (
          <Pressable style={styles.checkButton} onPress={handleCheck}>
            <Text style={styles.buttonText}>בדיקה</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.buttonText}>
              {words.length > 1 ? "המשך" : "סיום"}
            </Text>
          </Pressable>
        )}
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
  success: "#22c55e",
  error: "#ef4444",
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
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  sentenceBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: 24,
    minHeight: 80,
    justifyContent: "center",
  },
  sentenceText: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 50,
    width: "100%",
    marginBottom: 24,
    textAlign: "center",
  },
  correctInput: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  wrongInput: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  correctFeedback: {
    color: COLORS.success,
  },
  wrongFeedback: {
    color: COLORS.error,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  checkButton: {
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
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
});
