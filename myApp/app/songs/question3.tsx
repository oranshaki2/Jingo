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

/** ===== Types ===== */
type QuestionData = {
  sentence: string;
  correctAnswer: string;
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-pro";

export default function Question3Screen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ remainingWords: string; category: string; level: string }>;
  
  const [words, setWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
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
    } catch (e) {
      console.error("Failed to parse remaining words:", e);
      Alert.alert("Error", "Failed to parse remaining words.");
    } finally {
      setIsLoading(false);
    }
  }, [params.remainingWords]);

  /** ===== Fetch question from Gemini ===== */
  useEffect(() => {
    if (!currentWord) return;

    let cancelled = false;

    (async () => {
      try {
        if (!GEMINI_API_KEY) {
          throw new Error("Missing Gemini API key.");
        }

        setIsLoadingQuestion(true);
        setError(null);

        const prompt = buildGeminiPrompt(currentWord, params.category);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2 },
            }),
          }
        );

        if (!res.ok) {
          throw new Error(`Gemini HTTP ${res.status}`);
        }

        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const jsonText = extractFirstJsonObject(raw);
        const parsed = JSON.parse(jsonText) as QuestionData;

        if (!cancelled) {
          setQuestionData(parsed);
        }
      } catch (e: any) {
        setError(`Question fetch failed: ${e.message}`);
      } finally {
        if (!cancelled) setIsLoadingQuestion(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentWord]);

  const handleCheck = () => {
    if (!userAnswer.trim()) {
      Alert.alert("שגיאה", "אנא הקלידו תשובה");
      return;
    }
    setIsChecked(true);
  };

  const handleContinue = () => {
    if (!currentWord) return;

    // Create remaining words array (original list minus the selected word)
    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      // Words remain, loop back to Question1 with remaining words
      router.push({
        pathname: "/songs/question1",
        params: {
          words: JSON.stringify(remainingWords),
          category: params.category || "",
          level: params.level || "",
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

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isAnswerCorrect = userAnswer.trim().toLowerCase() === (questionData?.correctAnswer.toLowerCase() || "");

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>

        {/* ===== Question Title ===== */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>מלאו את המילה החסרה:</Text>
        </View>

        {/* ===== Sentence with Blank ===== */}
        {!isLoadingQuestion && questionData && (
          <View style={styles.sentenceBox}>
            <Text style={styles.sentenceText}>{questionData.sentence}</Text>
          </View>
        )}

        {/* ===== Loader or Input ===== */}
        {isLoadingQuestion ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <TextInput
            style={[
              styles.textInput,
              isChecked && isAnswerCorrect && styles.correctInput,
              isChecked && !isAnswerCorrect && styles.wrongInput,
            ]}
            placeholder="הקלידו את התשובה..."
            placeholderTextColor={COLORS.textDim}
            value={userAnswer}
            onChangeText={setUserAnswer}
            editable={!isChecked}
          />
        )}

        {/* ===== Feedback Message ===== */}
        {isChecked && (
          <Text
            style={[
              styles.feedbackText,
              isAnswerCorrect && styles.correctFeedback,
              !isAnswerCorrect && styles.wrongFeedback,
            ]}
          >
            {isAnswerCorrect ? "✓ תשובה נכונה!" : `✗ תשובה שגויה. התשובה הנכונה: ${questionData?.correctAnswer}`}
          </Text>
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

/** ===== Helpers ===== */
function buildGeminiPrompt(word: string, category: string | undefined): string {
  return `
Return ONLY valid JSON, with "sentence" and "correctAnswer".
Generate a fill-the-blank exercise:
- Create a sentence in English that uses the word "${word}" (from category "${category}")
- Replace the word with "___" in the sentence
- Provide the correct word as the answer
`;
}

function extractFirstJsonObject(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON found");
  }
  return s.slice(start, end + 1);
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
