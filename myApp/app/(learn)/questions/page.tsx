"use client";
import React from "react";
import QuestionSwitch from "./engine/QuestionSwitch";
import { useQuizEngine } from "./engine/useQuizEngine";
import { WordItem } from "./shared/types";

export default function WordsPage({ params }: { params?: { words?: string } }) {
  const songId = params?.words ?? "demo-song";

  const newWords: WordItem[] = [
    { id: "1", en: "t-shirt", he: "חולצת טי", sentenceEn: "I wear a t-shirt to the gym", templateEn: "I wear a ___ to the gym", distractorsHe: ["נעליים", "כובע", "גרב"] },
    { id: "2", en: "shoes", he: "נעליים", sentenceEn: "These shoes are very comfortable", templateEn: "These ___ are very comfortable", distractorsHe: ["מכנסיים", "שולחן", "עכבר"] },
    { id: "3", en: "hat", he: "כובע", sentenceEn: "I wear a hat in the sun", templateEn: "I wear a ___ in the sun", distractorsHe: ["חולצה", "מחשב", "חלון"] },
    { id: "4", en: "pants", he: "מכנסיים", sentenceEn: "My pants are black", templateEn: "My ___ are black", distractorsHe: ["נעל", "עיפרון", "כיסא"] },
  ];

  const engine = useQuizEngine(newWords, songId);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Learn – Demo</h1>
          <p className="text-sm text-gray-500">Rotating order: 1 → 2 → 3 → 1 while words remain</p>
        </div>
        <div className="text-right">
          <p className="text-sm">Progress: {engine.progress}/{engine.total}</p>
          <p className="text-sm">Correct: {engine.correctCount}</p>
        </div>
      </header>

      {!engine.done && engine.current && (
        <QuestionSwitch
          type={engine.currentType}
          word={engine.current}
          onAnswered={({ correct }) => engine.advance(correct)}
        />
      )}

      {engine.done && (
        <div className="rounded-2xl border p-6 text-center">
          <h2 className="text-xl font-semibold">All done! 🎉</h2>
          <p className="mt-2 text-gray-600">
            You answered {engine.correctCount} / {engine.total} correctly on the first try.
          </p>
        </div>
      )}

      <footer className="mt-8 text-xs text-gray-500">
        <p>
          Mistakes are saved to AsyncStorage (or localStorage on web) per song under
          <code> @mistakes/{songId}</code>.
        </p>
      </footer>
    </main>
  );
}
