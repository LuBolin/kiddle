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

const quickHistoryKey = "kiddle:v1:quick-history";
const infiniteBestKey = "kiddle:v1:infinite-best";
const dailyKey = (date: string) => `kiddle:v1:daily:${date}`;
const dailyProgressKey = (date: string) => `kiddle:v1:daily-progress:${date}`;

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

export function saveQuickResult(result: QuickResult): void {
  let history: QuickResult[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(quickHistoryKey) ?? "[]") as unknown;
    history = validHistory(parsed) ? parsed : [];
  } catch {
    // Corrupted history is replaced by the current result below.
  }
  try {
    localStorage.setItem(quickHistoryKey, JSON.stringify([result, ...history].slice(0, 10)));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function getInfiniteBest(): number {
  try {
    const value = Number(localStorage.getItem(infiniteBestKey));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveInfiniteBest(streak: number): number {
  const best = Math.max(getInfiniteBest(), streak);
  try {
    localStorage.setItem(infiniteBestKey, `${best}`);
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return best;
}

export function getDailyResult(date: string): DailyResult | null {
  try {
    const result = JSON.parse(localStorage.getItem(dailyKey(date)) ?? "null") as unknown;
    return validHistory([result]) ? result as DailyResult : null;
  } catch {
    return null;
  }
}

export function saveDailyResult(date: string, result: DailyResult): DailyResult {
  const existing = getDailyResult(date);
  if (existing) return existing;
  try {
    localStorage.setItem(dailyKey(date), JSON.stringify(result));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return result;
}

export function getDailyProgress(date: string): DailyProgress | null {
  try {
    const progress = JSON.parse(localStorage.getItem(dailyProgressKey(date)) ?? "null") as unknown;
    return validDailyProgress(progress) ? progress : null;
  } catch {
    return null;
  }
}

export function saveDailyProgress(date: string, progress: DailyProgress): void {
  try {
    localStorage.setItem(dailyProgressKey(date), JSON.stringify(progress));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function clearDailyProgress(date: string): void {
  try {
    localStorage.removeItem(dailyProgressKey(date));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}
