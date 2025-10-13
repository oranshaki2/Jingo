"use client";
import React, { useMemo, useState } from "react";
import { WordItem } from "../shared/types";
import { shuffle, normalize } from "../shared/utils";

type Props = {
  word: WordItem;
  onAnswered: (result: { correct: boolean }) => void;
};

export default function ChooseHebrewTranslation({ word, onAnswered }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = useMemo(() => {
    const ds = word.distractorsHe?.length ? word.distractorsHe : ["שולחן", "חתול", "בית"];
    return shuffle([word.he, ...ds]).slice(0, 4);
  }, [word]);

  const correct = chosen != null && normalize(chosen) === normalize(word.he);

  const submit = () => {
    setSubmitted(true);
    onAnswered({ correct });
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Choose the right Hebrew translation</h2>
      <p className="text-lg">
        What is the Hebrew translation of: <span className="font-medium">{word.en}</span>?
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 rounded-2xl border p-3 ${chosen === opt ? "ring-2" : ""}`}
          >
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
      <button className="rounded-2xl border px-4 py-2 shadow" onClick={submit} disabled={!chosen}>
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
