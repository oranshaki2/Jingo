export type QuestionType = "FILL" | "TRANSLATE" | "INSERT";

export type WordItem = {
  id: string;
  en: string;
  he: string;
  sentenceEn?: string;
  templateEn?: string;
  distractorsHe?: string[];
};

export type Mistake = {
  wordId: string;
  en: string;
  he: string;
  questionType: QuestionType;
  timestamp: number; // Date.now()
  songId?: string;
};
