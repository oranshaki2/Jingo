import React, { useMemo, useRef, useState } from "react";

// ===================== Types =====================
export type QuestionType = "FILL" | "TRANSLATE" | "INSERT";

export type WordItem = {
  id: string;
  en: string; // target word in English (or source language)
  he: string; // Hebrew translation
  // Optional helpers for building prompts
  sentenceEn?: string; // e.g., "I wear a t-shirt every day"
  templateEn?: string; // e.g., "I wear a ___ every day"
  distractorsHe?: string[]; // extra Hebrew options for the multiple choice
};

// ===================== Utils =====================
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const normalize = (s: string) => s.trim().toLowerCase();

// ===================== Question Views =====================

type BaseQuestionProps = {
  word: WordItem;
  onAnswered: (result: { correct: boolean }) => void;
};

// 1) Fill-in-the-blank (type the missing EN word into an English sentence)
function FillInBlank({ word, onAnswered }: BaseQuestionProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sentence = useMemo(() => {
    // Prefer templateEn if provided; otherwise build a simple one
    if (word.templateEn) return word.templateEn;
    if (word.sentenceEn) return word.sentenceEn.replace(new RegExp(word.en, "i"), "___");
    return `Type the missing word: ___`;
  }, [word]);

  const correct = normalize(value) === normalize(word.en);

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Fill in the blank</h2>
      <p className="text-lg">{sentence}</p>
      <input
        ref={inputRef}
        className="w-full rounded-2xl border p-3"
        placeholder="Your answer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setSubmitted(true);
            onAnswered({ correct });
          }
        }}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          className="rounded-2xl border px-4 py-2 shadow"
          onClick={() => {
            setSubmitted(true);
            onAnswered({ correct });
          }}
        >
          Submit
        </button>
      </div>
      {submitted && (
        <p className={correct ? "text-green-600" : "text-red-600"}>
          {correct ? "Correct!" : `Not quite. Correct: ${word.en}`}
        </p>
      )}
    </div>
  );
}

// 2) Choose the right Hebrew translation (multiple choice)
function ChooseHebrewTranslation({ word, onAnswered }: BaseQuestionProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = useMemo(() => {
    const ds = word.distractorsHe?.length ? word.distractorsHe : ["שולחן", "חתול", "בית"];
    return shuffle([word.he, ...ds]).slice(0, 4); // ensure max 4 options
  }, [word]);

  const correct = chosen != null && normalize(chosen) === normalize(word.he);

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Choose the right Hebrew translation</h2>
      <p className="text-lg">What is the Hebrew translation of: <span className="font-medium">{word.en}</span>?</p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <label key={opt} className={`flex items-center gap-2 rounded-2xl border p-3 ${chosen === opt ? "ring-2" : ""}`}>
            <input
              type="radio"
              name="he-options"
              value={opt}
              checked={chosen === opt}
              onChange={() => setChosen(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
      <button
        className="rounded-2xl border px-4 py-2 shadow"
        onClick={() => {
          setSubmitted(true);
          onAnswered({ correct });
        }}
        disabled={!chosen}
      >
        Submit
      </button>
      {submitted && (
        <p className={correct ? "text-green-600" : "text-red-600"}>
          {correct ? "Correct!" : `Not quite. Correct: ${word.he}`}
        </p>
      )}
    </div>
  );
}

// 3) Insert the blank word (type the EN word that fits a short prompt)
function InsertBlankWord({ word, onAnswered }: BaseQuestionProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Build a simple cloze-like prompt if none is provided
  const prompt = useMemo(() => {
    if (word.templateEn) return word.templateEn;
    if (word.sentenceEn) return word.sentenceEn.replace(new RegExp(word.en, "i"), "___");
    return `Insert the word that best fits: I use ___`;
  }, [word]);

  const correct = normalize(value) === normalize(word.en);

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Insert the blank word</h2>
      <p className="text-lg">{prompt}</p>
      <input
        className="w-full rounded-2xl border p-3"
        placeholder="Type the word"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setSubmitted(true);
            onAnswered({ correct });
          }
        }}
        autoFocus
      />
      <button
        className="rounded-2xl border px-4 py-2 shadow"
        onClick={() => {
          setSubmitted(true);
          onAnswered({ correct });
        }}
      >
        Submit
      </button>
      {submitted && (
        <p className={correct ? "text-green-600" : "text-red-600"}>
          {correct ? "Correct!" : `Not quite. The word is: ${word.en}`}
        </p>
      )}
    </div>
  );
}

// ===================== Engine =====================

const QUESTION_TYPES: QuestionType[] = ["FILL", "TRANSLATE", "INSERT"];

function useQuizEngine(initialWords: WordItem[]) {
  const [queue, setQueue] = useState<WordItem[]>(() => shuffle(initialWords));
  const [typeIndex, setTypeIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [total] = useState(initialWords.length);
  const [correctCount, setCorrectCount] = useState(0);

  const current = queue[0];
  const currentType = QUESTION_TYPES[typeIndex];
  const progress = total - queue.length; // answered so far

  const advance = (isCorrect: boolean) => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...rest] = prev;
      if (isCorrect) {
        return rest;
      } else {
        // push incorrect to the end
        return [...rest, head];
      }
    });

    setTypeIndex((i) => (i + 1) % QUESTION_TYPES.length); // rotate 1→2→3→1

    if (isCorrect) setCorrectCount((c) => c + 1);
  };

  React.useEffect(() => {
    if (queue.length === 0 && !done) {
      setDone(true);
    }
  }, [queue, done]);

  return {
    current,
    currentType,
    progress,
    total,
    correctCount,
    done,
    advance,
  };
}

// ===================== Page / Container =====================

export default function LearnDemo() {
  // In your app, pass newWords from the song's data (server or previous screen)
  const newWords: WordItem[] = [
    {
      id: "1",
      en: "t-shirt",
      he: "חולצת טי",
      sentenceEn: "I wear a t-shirt to the gym",
      templateEn: "I wear a ___ to the gym",
      distractorsHe: ["נעליים", "כובע", "גרב"]
    },
    {
      id: "2",
      en: "shoes",
      he: "נעליים",
      sentenceEn: "These shoes are very comfortable",
      templateEn: "These ___ are very comfortable",
      distractorsHe: ["מכנסיים", "שולחן", "עכבר"]
    },
    {
      id: "3",
      en: "hat",
      he: "כובע",
      sentenceEn: "I wear a hat in the sun",
      templateEn: "I wear a ___ in the sun",
      distractorsHe: ["חולצה", "מחשב", "חלון"]
    },
    {
      id: "4",
      en: "pants",
      he: "מכנסיים",
      sentenceEn: "My pants are black",
      templateEn: "My ___ are black",
      distractorsHe: ["נעל", "עיפרון", "כיסא"]
    },
  ];

  const engine = useQuizEngine(newWords);

  return (
    <div className="mx-auto max-w-2xl p-6">
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
          <button
            className="mt-4 rounded-2xl border px-4 py-2 shadow"
            onClick={() => location.reload()}
          >
            Restart demo
          </button>
        </div>
      )}

      <footer className="mt-8 text-xs text-gray-500">
        <p>
          Swap in your own <code>newWords</code> from the selected song. The engine keeps rotating
          question types (FILL → TRANSLATE → INSERT) and pops correct answers from the queue while pushing incorrect
          ones to the end.
        </p>
      </footer>
    </div>
  );
}

function QuestionSwitch({
  type,
  word,
  onAnswered,
}: {
  type: QuestionType;
  word: WordItem;
  onAnswered: (r: { correct: boolean }) => void;
}) {
  switch (type) {
    case "FILL":
      return <FillInBlank word={word} onAnswered={onAnswered} />;
    case "TRANSLATE":
      return <ChooseHebrewTranslation word={word} onAnswered={onAnswered} />;
    case "INSERT":
      return <InsertBlankWord word={word} onAnswered={onAnswered} />;
    default:
      return null;
  }
}
