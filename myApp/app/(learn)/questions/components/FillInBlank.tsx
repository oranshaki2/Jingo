"use client";
import React, { useEffect, useState } from "react";
import { WordItem } from "../shared/types";
import { normalize, shuffle } from "../shared/utils";
import { CATEGORIES } from "../shared/category";

// עטיפה ל-AsyncStorage עם fallback ל-localStorage
let asyncStore: {
  getItem: (key: string) => Promise<string | null>;
} = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNAsyncStorage = require("@react-native-async-storage/async-storage").default;
  if (RNAsyncStorage) asyncStore = RNAsyncStorage;
} catch {
  console.warn("AsyncStorage לא נמצא, משתמש ב-localStorage fallback");
}

// ---------- פונקציות עזר ----------
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}
function splitSentences(lyrics: string): string[] {
  return lyrics
    .split(/\\r?\\n|(?<=[.!?])\\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
function findSentenceWithWord(sentences: string[], word: string): string | null {
  const r = new RegExp(`\\\\b${escapeRegExp(word)}\\\\b`, "i");
  return sentences.find((s) => r.test(s)) ?? null;
}
function getCategoryForWord(w: string): string | null {
  const needle = normalize(w);
  for (const [cat, words] of Object.entries(CATEGORIES)) {
    if (words.some((x) => normalize(x) === needle)) return cat;
  }
  return null;
}
function pickDistractors(category: string, correct: string, n = 3): string[] {
  const pool = CATEGORIES[category] || [];
  const filtered = pool.filter((x) => normalize(x) !== normalize(correct));
  if (filtered.length <= n) return filtered.slice(0, n);
  return shuffle(filtered).slice(0, n);
}

// ---------- קומפוננטה ----------
type Props = {
  word: WordItem;
  onAnswered: (result: { correct: boolean }) => void;
  songId?: string;
};

export default function FillInBlank({ word, onAnswered, songId = "global" }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sentence, setSentence] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      console.log("▶️ FillInBlank התחיל", { word, songId });

      // --- שלב 1: טעינת ליריקס ---
      const key = `@lyrics/${songId}`;
      const raw = (await asyncStore.getItem(key)) || "";
      const lyrics = typeof raw === "string" ? raw : "";
      console.log("📜 ליריקס שנטען:", lyrics.slice(0, 120) + "...");

      // --- שלב 2: מציאת משפט עם המילה ---
      const sentences = splitSentences(lyrics);
      const found = findSentenceWithWord(sentences, word.en);
      console.log("🔍 נמצא משפט?", !!found, found);

      const baseSentence =
        found ?? word.sentenceEn ?? `I use ${word.en} every day.`;
      const holed = baseSentence.replace(
        new RegExp(`\\b${escapeRegExp(word.en)}\\b`, "i"),
        "___"
      );
      setSentence(holed);
      console.log("📝 משפט סופי:", holed);

      // --- שלב 3: בחירת קטגוריה ומסיחים ---
      const cat = getCategoryForWord(word.en);
      console.log("📂 קטגוריה:", cat);
      const distractors = cat ? pickDistractors(cat, word.en, 3) : [];
      console.log("🎯 מסיחים מהקטגוריה:", distractors);

      const fallback = ["window", "table", "computer", "mouse", "glass"];
      const pool =
        distractors.length >= 3 ? distractors : shuffle(fallback).slice(0, 3);
      const opts = shuffle([word.en, ...pool]);
      setOptions(opts);
      console.log("✅ רשימת אופציות סופית:", opts);
    })();
  }, [songId, word.en, word.sentenceEn]);

  const correct = chosen != null && normalize(chosen) === normalize(word.en);

  const submit = () => {
    setSubmitted(true);
    onAnswered({ correct });
    console.log("📤 תשובה נשלחה:", { chosen, correct });
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Fill in the blank</h2>
      <p className="text-lg">{sentence ?? "Loading sentence..."}</p>

      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 rounded-2xl border p-3 ${
              chosen === opt ? "ring-2" : ""
            }`}
          >
            <input
              type="radio"
              name="missing-word-options"
              value={opt}
              checked={chosen === opt}
              onChange={() => {
                setChosen(opt);
                console.log("🖱️ נבחרה אופציה:", opt);
              }}
            />
            {opt}
          </label>
        ))}
      </div>

      <button
        className="rounded-2xl border px-4 py-2 shadow"
        onClick={submit}
        disabled={!chosen}
      >
        Submit
      </button>

      {submitted && (
        <p className={correct ? "text-green-600" : "text-red-600"}>
          {correct ? "Correct!" : `Not quite. Correct: ${word.en}`}
        </p>
      )}
    </div>
  );
}
