import { generateQuickSession } from "./game";
import type { CategoryId, Figure, Question } from "../types";

function assertDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Daily Challenge needs a YYYY-MM-DD date.");
}

export function dailyCategoryForDate(date: string, figures: Figure[]): CategoryId {
  assertDate(date);
  const active = figures.filter((figure) => figure.status === "active");
  const categories = [...new Set(active.map((figure) => figure.category))].filter((category) => active.filter((figure) => figure.category === category).length >= 20).sort();
  if (categories.length === 0) throw new Error("Daily Challenge needs at least one category with 20 active figures.");
  const seed = [...date].reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return categories[seed % categories.length];
}

export function dailyQuestionsForDate(date: string, category: CategoryId, figures: Figure[]): Question[] {
  assertDate(date);
  return generateQuickSession(figures.filter((figure) => figure.category === category), `daily:${date}:${category}`).map((question, index) => ({
    ...question,
    id: `daily-${date}-${index + 1}-${question.id}`,
  }));
}
