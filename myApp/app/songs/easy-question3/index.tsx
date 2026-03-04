import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import translationsHe from "@/assets/translations_he.json";
import styles, { COLORS } from "./_styles";

export default function Question3Screen() {
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
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHebrewTranslation = (word: string | null) => {
    if (!word) return null;
    const normalizedWord = String(word).trim().toLowerCase();
    return translationsHe[normalizedWord as keyof typeof translationsHe] ?? null;
  };

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
      if (params.correctWords) setCorrectWords(JSON.parse(params.correctWords));
      if (params.incorrectWords)
        setIncorrectWords(JSON.parse(params.incorrectWords));
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

    const isAnswerCorrect =
      userAnswer.trim().toLowerCase() === currentWord.toLowerCase();

    const newCorrectWords = isAnswerCorrect
      ? [...correctWords, currentWord]
      : correctWords;
    const newIncorrectWords = !isAnswerCorrect
      ? [...incorrectWords, currentWord]
      : incorrectWords;

    const remainingWords = words.filter((word) => word !== currentWord);

    if (remainingWords.length > 0) {
      router.push({
        pathname: "/songs/question1",
        params: {
          words: JSON.stringify(remainingWords),
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
    mistakenWords: string[]
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
          <Text style={styles.questionText}>מה פירוש המילה באנגלית?</Text>
        </View>

        {currentWord && (
          <View style={styles.wordBox}>
            <Text style={styles.wordLabel}>המילה בעברית:</Text>
            <Text style={styles.word}>
              {getHebrewTranslation(currentWord) ?? "לא נמצא תרגום למילה זו"}
            </Text>
          </View>
        )}

        {currentWord && (
          <>
            <TextInput
              style={[
                styles.textInput,
                isChecked &&
                  userAnswer.trim().toLowerCase() === currentWord.toLowerCase() &&
                  styles.correctInput,
                isChecked &&
                  userAnswer.trim().toLowerCase() !== currentWord.toLowerCase() &&
                  styles.wrongInput,
              ]}
              placeholder="הקלידו את התשובה באנגלית..."
              placeholderTextColor={COLORS.textDim}
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!isChecked}
            />

            {isChecked && (
              <Text
                style={[
                  styles.feedbackText,
                  userAnswer.trim().toLowerCase() === currentWord.toLowerCase() &&
                    styles.correctFeedback,
                  userAnswer.trim().toLowerCase() !== currentWord.toLowerCase() &&
                    styles.wrongFeedback,
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

      <View style={styles.buttonContainer}>
        {!isChecked ? (
          <Pressable style={styles.checkButton} onPress={handleCheck}>
            <Text style={styles.buttonText}>בדיקה</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.buttonText}>{words.length > 1 ? "המשך" : "סיום"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
