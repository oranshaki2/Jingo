"use client";
import React from "react";
import { QuestionType, WordItem } from "../shared/types";
import FillInBlank from "../components/FillInBlank";
import ChooseHebrewTranslation from "../components/ChooseHebrewTranslation";
import InsertBlankWord from "../components/InsertBlankWord";

export default function QuestionSwitch({
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
