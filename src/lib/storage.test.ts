import { beforeEach, describe, expect, it } from "vitest";
import { clearDailyProgress, getDailyProgress, getDailyResult, getInfiniteBest, saveDailyProgress, saveDailyResult, saveInfiniteBest, saveQuickResult } from "./storage";

describe("Quick result storage", () => {
  beforeEach(() => localStorage.clear());

  it("preserves recent valid results and recovers from corrupted data", () => {
    localStorage.setItem("kiddle:v1:quick-history", "not-json");
    saveQuickResult({ score: 7, completedAt: "2026-07-18T00:00:00.000Z" });
    saveQuickResult({ score: 8, completedAt: "2026-07-18T00:01:00.000Z" });
    expect(JSON.parse(localStorage.getItem("kiddle:v1:quick-history") ?? "[]")).toEqual([
      { score: 8, completedAt: "2026-07-18T00:01:00.000Z" },
      { score: 7, completedAt: "2026-07-18T00:00:00.000Z" },
    ]);
  });

  it("keeps the highest Infinite streak without relying on storage", () => {
    localStorage.setItem("kiddle:v1:infinite-best", "not-a-number");
    expect(getInfiniteBest()).toBe(0);
    expect(saveInfiniteBest(4)).toBe(4);
    expect(saveInfiniteBest(2)).toBe(4);
    expect(getInfiniteBest()).toBe(4);
  });

  it("locks the first completed Daily result for a date", () => {
    const first = { score: 6, completedAt: "2026-07-18T00:00:00.000Z" };
    const replay = { score: 10, completedAt: "2026-07-18T00:02:00.000Z" };
    expect(saveDailyResult("2026-07-18", first)).toEqual(first);
    expect(saveDailyResult("2026-07-18", replay)).toEqual(first);
    expect(getDailyResult("2026-07-18")).toEqual(first);
  });

  it("restores an in-progress Daily Challenge and discards corrupt progress", () => {
    const progress = { index: 2, answers: [true, false], selectedFigureId: null };
    saveDailyProgress("2026-07-18", progress);
    expect(getDailyProgress("2026-07-18")).toEqual(progress);
    clearDailyProgress("2026-07-18");
    expect(getDailyProgress("2026-07-18")).toBeNull();
    localStorage.setItem("kiddle:v1:daily-progress:2026-07-18", '{"index":2,"answers":[true],"selectedFigureId":null}');
    expect(getDailyProgress("2026-07-18")).toBeNull();
  });
});
