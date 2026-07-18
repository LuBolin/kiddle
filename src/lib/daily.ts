import { generateQuickSession } from "./game";
import type { Figure, Question } from "../types";

export function dailyQuestionsForDate(date: string, figures: Figure[]): Question[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Daily Challenge needs a YYYY-MM-DD date.");
  return generateQuickSession(figures, `daily:${date}`).map((question, index) => ({
    ...question,
    id: `daily-${date}-${index + 1}-${question.id}`,
  }));
}
