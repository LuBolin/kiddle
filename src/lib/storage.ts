export interface QuickResult {
  score: number;
  completedAt: string;
}

export interface DailyResult extends QuickResult {
  answers?: boolean[];
}

export interface DailyProgress {
  index: number;
  answers: boolean[];
  selectedFigureId: string | null;
}

const quickHistoryKey = (poolKey: string) => `kiddle:v1:quick-history:${poolKey}`;
const infiniteBestKey = (poolKey: string) => `kiddle:v1:infinite-best:${poolKey}`;
const dailyKey = (poolKey: string, date: string) => `kiddle:v1:daily:${poolKey}:${date}`;
const dailyProgressKey = (poolKey: string, date: string) => `kiddle:v1:daily-progress:${poolKey}:${date}`;

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

function validDailyResult(value: unknown): value is DailyResult {
  if (!validHistory([value])) return false;
  const answers = (value as DailyResult).answers;
  return answers === undefined || (Array.isArray(answers) && answers.length === 10 && answers.every((answer) => typeof answer === "boolean"));
}

export function saveQuickResult(poolKey: string, result: QuickResult): void {
  let history: QuickResult[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(quickHistoryKey(poolKey)) ?? "[]") as unknown;
    history = validHistory(parsed) ? parsed : [];
  } catch {
    // Corrupted history is replaced by the current result below.
  }
  try {
    localStorage.setItem(quickHistoryKey(poolKey), JSON.stringify([result, ...history].slice(0, 10)));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function getInfiniteBest(poolKey: string): number {
  try {
    const value = Number(localStorage.getItem(infiniteBestKey(poolKey)));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveInfiniteBest(poolKey: string, streak: number): number {
  const best = Math.max(getInfiniteBest(poolKey), streak);
  try {
    localStorage.setItem(infiniteBestKey(poolKey), `${best}`);
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return best;
}

export function getDailyResult(poolKey: string, date: string): DailyResult | null {
  try {
    const result = JSON.parse(localStorage.getItem(dailyKey(poolKey, date)) ?? "null") as unknown;
    return validDailyResult(result) ? result : null;
  } catch {
    return null;
  }
}

export function saveDailyResult(poolKey: string, date: string, result: DailyResult): DailyResult {
  const existing = getDailyResult(poolKey, date);
  if (existing) return existing;
  try {
    localStorage.setItem(dailyKey(poolKey, date), JSON.stringify(result));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
  return result;
}

export function getDailyProgress(poolKey: string, date: string): DailyProgress | null {
  try {
    const progress = JSON.parse(localStorage.getItem(dailyProgressKey(poolKey, date)) ?? "null") as unknown;
    return validDailyProgress(progress) ? progress : null;
  } catch {
    return null;
  }
}

export function saveDailyProgress(poolKey: string, date: string, progress: DailyProgress): void {
  try {
    localStorage.setItem(dailyProgressKey(poolKey, date), JSON.stringify(progress));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}

export function clearDailyProgress(poolKey: string, date: string): void {
  try {
    localStorage.removeItem(dailyProgressKey(poolKey, date));
  } catch {
    // Storage is optional; a blocked store must not stop the game.
  }
}
