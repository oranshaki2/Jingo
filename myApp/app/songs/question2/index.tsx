import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import questionsRegistry from "@/assets/questions";
import styles, { COLORS } from "./_styles";

/** ===== Types ===== */
type QuestionData = {
  sentence: string;
  options: string[];
  correctAnswerIndex: number;
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-pro";

export default function Question2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams() as Partial<{
    remainingWords: string;
    category: string;
    level: string;
    correctWords?: string;
    incorrectWords?: string;
    userId?: string;
    songId?: string;
  }>;

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

  useEffect(() => {
    try {
      if (params.remainingWords) {
        const parsedWords = JSON.parse(params.remainingWords);
        if (Array.isArray(parsedWords) && parsedWords.length > 0) {
          setWords(parsedWords);
          const randomIndex = Math.floor(Math.random() * parsedWords.length);
          setCurrentWord(parsedWords[randomIndex]);
        } else {
          Alert.alert("Error", "No words received or words list is empty.");
        }
      }

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

  /** ===== Fetch question from Gemini ===== */
  useEffect(() => {
    if (!currentWord) return;

    let cancelled = false;

    (async () => {
      try {
        setIsLoadingQuestion(true);
        setError(null);

        if (questionsRegistry[currentWord]?.question2) {
          const questionFromAsset = questionsRegistry[currentWord].question2;
          if (!cancelled) {
            setQuestionData(questionFromAsset as QuestionData);
          }
          return;
        }

        if (!GEMINI_API_KEY) {
          throw new Error("Missing Gemini API key.");
        }

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
          },
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
    if (selectedOption === null) {
      Alert.alert("שגיאה", "לא נבחרה תשובה");
      return;
    }
    setIsChecked(true);
  };

  const handleContinue = () => {
    if (!currentWord) return;

    const isAnswerCorrect = selectedOption === questionData?.correctAnswerIndex;

    const newCorrectWords = isAnswerCorrect
      ? [...correctWords, currentWord]
      : correctWords;
    const newIncorrectWords = !isAnswerCorrect
      ? [...incorrectWords, currentWord]
      : incorrectWords;

    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      router.push({
        pathname: "/songs/question3",
        params: {
          remainingWords: JSON.stringify(remainingWords),
          correctWords: JSON.stringify(newCorrectWords),
          incorrectWords: JSON.stringify(newIncorrectWords),
          category: params.category || "",
          level: params.level || "",
          userId: params.userId,
          songId: params.songId,
        },
      });
    } else {
      navigateToFinish(newCorrectWords, newIncorrectWords);
    }
  };

  const navigateToFinish = (
    correctWords: string[],
    mistakenWords: string[],
  ) => {
    router.push({
      pathname: "/songs/finish",
      params: {
        correctWords: JSON.stringify(correctWords),
        incorrectWords: JSON.stringify(mistakenWords),
        userId: params.userId,
        songId: params.songId,
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
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>השלימו את המשפט:</Text>
        </View>

        {!isLoadingQuestion && questionData && (
          <View style={styles.sentenceBox}>
            <Text style={styles.sentenceText}>{questionData.sentence}</Text>
          </View>
        )}

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
Return ONLY valid JSON, with "sentence", "options" and "correctAnswerIndex".
Generate a fill-the-blank exercise:
- Create a sentence in English that uses the word "${word}" (from category "${category}")
- Replace the word with a blank (shown as _______ in the sentence)
- Provide 4 options: the correct word and 3 plausible but incorrect distractors
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
