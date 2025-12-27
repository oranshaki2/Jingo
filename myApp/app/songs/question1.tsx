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

/** ===== Types ===== */
type QuestionData = {
  options: string[];
  correctAnswerIndex: number;
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-pro";

export default function Question1Screen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{ words: string; category: string; level: string; correctWords?: string; incorrectWords?: string; userId?: string }>;

  const [words, setWords] = useState<string[]>([]);
  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** ===== Parse words and tracking lists ===== */
  useEffect(() => {
    try {
      if (params.words) {
        const parsedWords = JSON.parse(params.words);
        if (Array.isArray(parsedWords) && parsedWords.length > 0) {
          setWords(parsedWords);
          const randomIndex = Math.floor(Math.random() * parsedWords.length);
          setCurrentWord(parsedWords[randomIndex]);
        } else {
          Alert.alert("שגיאה", "לא נטענו מילים ללמוד");
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
      Alert.alert("שגיאה", "טעינת המילים נכשלה");
    } finally {
      setIsLoading(false);
    }
  }, [params.words]);

  /** ===== Fetch options from Gemini ===== */
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
        const raw =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

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
    if (selectedOption === null) {
      Alert.alert("שגיאה", "לא נבחרה תשובה");
      return;
    }
    setIsChecked(true);
  };

  const handleContinue = () => {
    if (!currentWord || selectedOption === null || questionData === null) return;

    // Determine if answer is correct
    const isAnswerCorrect = selectedOption === questionData.correctAnswerIndex;
    
    // Update tracking lists
    const newCorrectWords = isAnswerCorrect 
      ? [...correctWords, currentWord] 
      : correctWords;
    const newIncorrectWords = !isAnswerCorrect 
      ? [...incorrectWords, currentWord] 
      : incorrectWords;

    const remainingWords = words.filter((w) => w !== currentWord);
    const levelNum = params.level ? Number(params.level) : 0;
    const nextPath = (levelNum === 1 ? "/songs/easy-question2" : "/songs/question2") as any;

    if (remainingWords.length > 0) {
      router.push({
        pathname: nextPath,
        params: { 
          remainingWords: JSON.stringify(remainingWords),
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
        {/* ===== Word ===== */}
        {currentWord && (
          <View style={styles.wordBox}>
            <Text style={styles.wordLabel}>המילה הנלמדת:</Text>
            <Text style={styles.word}>{currentWord}</Text>
          </View>
        )}

        {/* ===== Static Question ===== */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>
            בחרו את התרגום הנכון של המילה:
          </Text>
        </View>

        {/* ===== Options / Loader ===== */}
        <View style={styles.optionsContainer}>
          {isLoadingQuestion && (
            <ActivityIndicator size="large" color={COLORS.primary} />
          )}

          {!isLoadingQuestion &&
            questionData?.options.map((option, index) => {
              let optionStyle: any = styles.optionButton;
              let optionTextStyle: any = styles.optionText;

              if (isChecked) {
                if (
                  index === selectedOption &&
                  index === questionData.correctAnswerIndex
                ) {
                  optionStyle = [styles.optionButton, styles.correctOption];
                  optionTextStyle = [styles.optionText, styles.correctText];
                } else if (
                  index === selectedOption &&
                  index !== questionData.correctAnswerIndex
                ) {
                  optionStyle = [styles.optionButton, styles.wrongOption];
                  optionTextStyle = [styles.optionText, styles.wrongText];
                } else if (index === questionData.correctAnswerIndex) {
                  optionStyle = [styles.optionButton, styles.correctOption];
                  optionTextStyle = [styles.optionText, styles.correctText];
                }
              } else if (index === selectedOption) {
                optionStyle = [styles.optionButton, styles.selectedOption];
              }

              return (
                <Pressable
                  key={index}
                  style={optionStyle}
                  onPress={() => !isChecked && setSelectedOption(index)}
                  disabled={isChecked}
                >
                  <Text style={optionTextStyle}>{option}</Text>
                </Pressable>
              );
            })}
        </View>
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
Return ONLY valid JSON, with "options" and "correctAnswerIndex".
Generate 4 Hebrew translations for the English word "${word}" which belongs to the category "${category}":
- One correct translation
- Three plausible but incorrect distractors
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
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  border: "#e9ecef",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
    justifyContent: "space-between",
  },
  contentContainer: {
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
    color: COLORS.textDim,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
  },
  questionBox: {
    backgroundColor: "#F0F8F8",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: "#E6FAF7",
  },
  correctOption: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  wrongOption: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  optionText: {
    fontSize: 16,
  },
  correctText: {
    color: "#10B981",
    fontWeight: "700",
  },
  wrongText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textDim,
  },
  errorText: {
    color: "#b00020",
    textAlign: "center",
  },
});