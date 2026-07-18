import { generateQuickSession } from "./game";
import type { CategoryId, Figure, Question } from "../types";
import { categoryKey } from "../categories";

export function dailyQuestionsForDate(date: string, pool: CategoryId[], figures: Figure[]): Question[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Daily Challenge needs a YYYY-MM-DD date.");
  return generateQuickSession(figures, `daily:${date}:${categoryKey(pool)}`).map((question, index) => ({
    ...question,
    id: `daily-${date}-${index + 1}-${question.id}`,
  }));
}
