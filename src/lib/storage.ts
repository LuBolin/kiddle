import type { CategoryId } from "../types";

export interface QuickResult {
  score: number;
  completedAt: string;
}

export interface DailyResult extends QuickResult {}

export interface DailyProgress {
  index: number;
  answers: boolean[];
  selectedFigureId: string | null;
}

const quickHistoryKey = (category: CategoryId) => `kiddle:v1:quick-history:${category}`;
const infiniteBestKey = (category: CategoryId) => `kiddle:v1:infinite-best:${category}`;
const dailyKey = (category: CategoryId, date: string) => `kiddle:v1:daily:${category}:${date}`;
const dailyProgressKey = (category: CategoryId, date: string) => `kiddle:v1:daily-progress:${category}:${date}`;

function validHistory(value: unknown): value is QuickResult[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null &&
    Number.isInteger((item as QuickResult).score) &&
    (item as QuickResult).score >= 0 &&
    (item as QuickResult).score <= 10 &&
    typeof (item as QuickResult).completedAt === "string",
  );
}

function validDailyProgress(value: unknown): value is DailyProgress {
  if (typeof value !== "object" || value === null) return false;
  const progress = value as DailyProgress;
  if (!Number.isInteger(progress.index) || progress.index < 0 || progress.index > 9 || !Array.isArray(progress.answers) || !progress.answers.every((answer) => typeof answer === "boolean")) return false;
  const answeredCurrentQuestion = progress.answers.length === progress.index + 1 && typeof progress.selectedFigureId === "string";
  const awaitingAnswer = progress.answers.length === progress.index && progress.selectedFigureId === null;
  return answeredCurrentQuestion || awaitingAnswer;
}

export function saveQuickResult(category: CategoryId, result: QuickResult): void {
  let history: QuickResult[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(quickHistoryKey(category)) ?? "[]") as unknown;
    history = validHistory(parsed) ? parsed : [];
  } catch {
    // Corrupted history is replaced by the current result below.
  }
  try {
    localStorage.setItem(quickHistoryKey(category), JSON.stringify([result, ...history].slice(0, 10)));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function getInfiniteBest(category: CategoryId): number {
  try {
    const value = Number(localStorage.getItem(infiniteBestKey(category)));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveInfiniteBest(category: CategoryId, streak: number): number {
  const best = Math.max(getInfiniteBest(category), streak);
  try {
    localStorage.setItem(infiniteBestKey(category), `${best}`);
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return best;
}

export function getDailyResult(category: CategoryId, date: string): DailyResult | null {
  try {
    const result = JSON.parse(localStorage.getItem(dailyKey(category, date)) ?? "null") as unknown;
    return validHistory([result]) ? result as DailyResult : null;
  } catch {
    return null;
  }
}

export function saveDailyResult(category: CategoryId, date: string, result: DailyResult): DailyResult {
  const existing = getDailyResult(category, date);
  if (existing) return existing;
  try {
    localStorage.setItem(dailyKey(category, date), JSON.stringify(result));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return result;
}

export function getDailyProgress(category: CategoryId, date: string): DailyProgress | null {
  try {
    const progress = JSON.parse(localStorage.getItem(dailyProgressKey(category, date)) ?? "null") as unknown;
    return validDailyProgress(progress) ? progress : null;
  } catch {
    return null;
  }
}

export function saveDailyProgress(category: CategoryId, date: string, progress: DailyProgress): void {
  try {
    localStorage.setItem(dailyProgressKey(category, date), JSON.stringify(progress));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function clearDailyProgress(category: CategoryId, date: string): void {
  try {
    localStorage.removeItem(dailyProgressKey(category, date));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}
