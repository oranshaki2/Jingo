"use client";
import React, { useMemo, useState } from "react";
import { WordItem } from "../shared/types";
import { normalize } from "../shared/utils";

type Props = {
  word: WordItem;
  onAnswered: (result: { correct: boolean }) => void;
};

export default function InsertBlankWord({ word, onAnswered }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const prompt = useMemo(() => {
    if (word.templateEn) return word.templateEn;
    if (word.sentenceEn) return word.sentenceEn.replace(new RegExp(word.en, "i"), "___");
    return `Insert the word that best fits: I use ___`;
  }, [word]);

  const correct = normalize(value) === normalize(word.en);

  const submit = () => {
    setSubmitted(true);
    onAnswered({ correct });
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Insert the blank word</h2>
      <p className="text-lg">{prompt}</p>
      <input
        className="w-full rounded-2xl border p-3"
        placeholder="Type the word"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <button className="rounded-2xl border px-4 py-2 shadow" onClick={submit}>
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
