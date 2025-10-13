"use client";
import * as React from "react";
import { WordItem, QuestionType } from "../shared/types";
import { shuffle } from "../shared/utils";
import { addMistake } from "../shared/storage";

const QUESTION_TYPES: QuestionType[] = ["FILL", "TRANSLATE", "INSERT"];

export function useQuizEngine(initialWords: WordItem[], songId?: string) {
  const [queue, setQueue] = React.useState<WordItem[]>(() => shuffle(initialWords));
  const [typeIndex, setTypeIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [total] = React.useState(initialWords.length);
  const [correctCount, setCorrectCount] = React.useState(0);

  const current = queue[0];
  const currentType = QUESTION_TYPES[typeIndex];
  const progress = total - queue.length;

  const advance = React.useCallback(
    async (isCorrect: boolean) => {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [head, ...rest] = prev;
        if (isCorrect) return rest;
        return [...rest, head];
      });

      if (!isCorrect && current) {
        await addMistake({
          wordId: current.id,
          en: current.en,
          he: current.he,
          questionType: currentType,
          timestamp: Date.now(),
          songId,
        });
      }

      setTypeIndex((i) => (i + 1) % QUESTION_TYPES.length);
      if (isCorrect) setCorrectCount((c) => c + 1);
    },
    [current, currentType, songId]
  );

  React.useEffect(() => {
    if (queue.length === 0 && !done) setDone(true);
  }, [queue, done]);

  return { current, currentType, progress, total, correctCount, done, advance };
}
