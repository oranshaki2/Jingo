import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, FlatList } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";

// ====== THEME (match your existing app palette) ======
const COLORS = {
  primary: "#4EC4C4",      // turquoise
  secondary: "#1A3D5A",    // deep navy
  bgLight: "#F5F7F9",      // soft gray
  textDark: "#333333",
  accent: "#A8E6CF",
  danger: "#E74C3C",
  success: "#2ECC71",
  border: "#E3E8EF",
};

// ====== NAV PARAMS ======
// Expect navigation to pass: words: string[], lyrics: string, category: string
// Example: router.push({ pathname: "/(learn)/learning", params: { words: JSON.stringify(["jeans","shoes","shirt"]), lyrics, category: "clothes" }})

type Params = {
  words?: string;        // JSON stringified array
  lyrics?: string;       // raw lyrics
  category?: string;     // e.g., "clothes"
};

// ====== UTILS ======
const normalize = (s: string) => s
  .toLowerCase()
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .replace(/[“”\"'`]/g, "")
  .trim();

const wordBoundaryRegex = (word: string) => new RegExp(`(^|[^a-zA-Z])(${escapeRegExp(word)})($|[^a-zA-Z])`, "i");
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Split lyrics to candidate sentences/lines
const splitLyrics = (lyrics: string): string[] => {
  if (!lyrics) return [];
  // Keep lines and sentence endings; filter out very short fragments
  const raw = lyrics
    .split(/\n+/) // lines
    .flatMap(line => line.split(/(?<=[.!?])\s+/)) // also by sentence punctuation
    .map(s => s.trim())
    .filter(s => s.length >= 12);
  return raw;
};

// Find the first sentence that contains the exact word (by boundaries)
const findSentenceForWord = (lyrics: string, word: string): string | null => {
  const sentences = splitLyrics(lyrics);
  const rx = wordBoundaryRegex(word);
  for (const s of sentences) {
    if (rx.test(s)) return s;
  }
  return null;
};

// Mask the word in the sentence with a blank
const maskWordInSentence = (sentence: string, word: string): string => {
  const rx = new RegExp(escapeRegExp(word), "ig");
  return sentence.replace(rx, "___");
};

// Shuffle helper
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ====== API placeholder to pull distractors from your category.py backend ======
// Implement this endpoint on your server (Python/Flask/FastAPI or Node that wraps category.py):
// GET /api/category-words?category=clothes  -> returns string[] of words from that category
async function fetchCategoryWords(category: string): Promise<string[]> {
  try {
    // TODO: replace with your real base URL from env
    const base = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/category-words?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error("Failed to load category words");
    const data: string[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("fetchCategoryWords error", e);
    return [];
  }
}

// ====== MAIN COMPONENT ======
export default function LearningScreen() {
  const params = useLocalSearchParams<Params>();
  const words: string[] = useMemo(() => {
    try { return params.words ? JSON.parse(params.words) : []; } catch { return []; }
  }, [params.words]);
  const lyrics = params.lyrics ?? "";
  const category = params.category ?? "";

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<string>("");
  const [correctWord, setCorrectWord] = useState<string>("");
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  const progress = words.length ? (index + 1) / words.length : 0;

  const buildQuestion = useCallback(async (w: string) => {
    setLoading(true);
    try {
      const sentence = findSentenceForWord(lyrics, w);
      if (!sentence) {
        // Skip gracefully if no sentence found
        setQuestion("");
        setChoices([]);
        setCorrectWord("");
        return;
      }
      const masked = maskWordInSentence(sentence, w);
      const pool = await fetchCategoryWords(category);
      const poolFiltered = pool.filter(x => normalize(x) !== normalize(w));
      const distractors = shuffle(poolFiltered).slice(0, 3);
      const options = shuffle([w, ...distractors]);

      setQuestion(masked);
      setCorrectWord(w);
      setChoices(options);
      setSelected(null);
      setIsCorrect(null);
    } finally {
      setLoading(false);
    }
  }, [lyrics, category]);

  useEffect(() => {
    if (!words.length) return;
    buildQuestion(words[index]);
  }, [index, words, buildQuestion]);

  const onSelect = (choice: string) => {
    if (selected) return;
    setSelected(choice);
    const ok = normalize(choice) === normalize(correctWord);
    setIsCorrect(ok);
    if (ok) setScore(s => s + 1);
  };

  const onNext = () => {
    if (index + 1 >= words.length) {
      Alert.alert("Great job!", `Your score: ${score}/${words.length}`);
      router.back();
      return;
    }
    setIndex(i => i + 1);
  };

  const onSkip = () => {
    onNext();
  };

  // If a word has no sentence, auto-skip when finished loading.
  useEffect(() => {
    if (!loading && question === "" && words.length) {
      // No sentence for this word
      setTimeout(() => setIndex(i => Math.min(i + 1, words.length - 1)), 0);
    }
  }, [loading, question, words.length]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "לימוד — השלם את החסר" }} />

      {/* Progress Bar */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{index + 1}/{words.length}</Text>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Text style={styles.promptLabel}>בחר/י את המילה החסרה:</Text>
            <Text style={styles.questionText}>
              {question || "מחפש/ת שורה מתאימה במילים…"}
            </Text>

            <View style={{ height: 16 }} />

            <FlatList
              data={choices}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selected === item;
                const showState = selected !== null;
                const correct = normalize(item) === normalize(correctWord);
                const bg = !showState
                  ? "#fff"
                  : isSelected && correct
                  ? COLORS.success
                  : isSelected && !correct
                  ? COLORS.danger
                  : correct
                  ? COLORS.accent
                  : "#fff";
                const borderColor = showState && isSelected ? COLORS.secondary : COLORS.border;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    disabled={selected !== null}
                    style={[styles.choiceBtn, { backgroundColor: bg, borderColor }]}
                  >
                    <Text style={styles.choiceText}>{item}</Text>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={{ paddingVertical: 4 }}
            />

            <View style={styles.actionsRow}>
              <Pressable onPress={onSkip} style={[styles.secondaryBtn]}> 
                <Text style={styles.secondaryBtnText}>דלג/י</Text>
              </Pressable>
              <Pressable onPress={onNext} style={[styles.primaryBtn]}>
                <Text style={styles.primaryBtnText}>{index + 1 >= words.length ? "סיום" : "הבא"}</Text>
              </Pressable>
            </View>

            {isCorrect !== null && (
              <Text style={[styles.feedback, { color: isCorrect ? COLORS.success : COLORS.danger }]}>
                {isCorrect ? "נכון!" : `לא נכון. התשובה: ${correctWord}`}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ====== STYLES ======
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    padding: 16,
  },
  progressWrap: {
    height: 8,
    backgroundColor: "#E9EEF5",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    marginTop: 8,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptLabel: {
    color: COLORS.secondary,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
  },
  questionText: {
    color: COLORS.textDark,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  choiceBtn: {
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  choiceText: {
    fontSize: 18,
    color: COLORS.textDark,
    textAlign: "center",
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
  feedback: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});

// ====== OPTIONAL: Example Express route (server) ======
// If your distractors live in category.py on the backend, expose them via an API.
// In Node/Express (wrapping Python or porting category.py data to JSON):
/*
import express from 'express';
const app = express();

// Suppose you exported a JSON map from category.py => categoryWords[category] = ["jeans","shirt",...]
// Or call a Python process to return the list.
const categoryWords: Record<string, string[]> = {
  clothes: ["jeans","shirt","shoes","dress","hat","coat","socks","scarf","jacket","skirt"],
};

app.get('/api/category-words', (req, res) => {
  const category = String(req.query.category || '').toLowerCase();
  const words = categoryWords[category] || [];
  res.json(words);
});

app.listen(3000);
*/
