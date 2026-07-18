import { beforeEach, describe, expect, it } from "vitest";
import { clearDailyProgress, getDailyProgress, getDailyResult, getInfiniteBest, saveDailyProgress, saveDailyResult, saveInfiniteBest, saveQuickResult } from "./storage";

describe("Quick result storage", () => {
  beforeEach(() => localStorage.clear());

  it("preserves recent valid results and recovers from corrupted data", () => {
    localStorage.setItem("kiddle:v1:quick-history:western-history", "not-json");
    saveQuickResult("western-history", { score: 7, completedAt: "2026-07-18T00:00:00.000Z" });
    saveQuickResult("western-history", { score: 8, completedAt: "2026-07-18T00:01:00.000Z" });
    expect(JSON.parse(localStorage.getItem("kiddle:v1:quick-history:western-history") ?? "[]")).toEqual([
      { score: 8, completedAt: "2026-07-18T00:01:00.000Z" },
      { score: 7, completedAt: "2026-07-18T00:00:00.000Z" },
    ]);
  });

  it("keeps the highest Infinite streak without relying on storage", () => {
    localStorage.setItem("kiddle:v1:infinite-best:western-history", "not-a-number");
    expect(getInfiniteBest("western-history")).toBe(0);
    expect(saveInfiniteBest("western-history", 4)).toBe(4);
    expect(saveInfiniteBest("western-history", 2)).toBe(4);
    expect(getInfiniteBest("western-history")).toBe(4);
  });

  it("locks the first completed Daily result for a date", () => {
    const first = { score: 6, completedAt: "2026-07-18T00:00:00.000Z" };
    const replay = { score: 10, completedAt: "2026-07-18T00:02:00.000Z" };
    expect(saveDailyResult("western-history", "2026-07-18", first)).toEqual(first);
    expect(saveDailyResult("western-history", "2026-07-18", replay)).toEqual(first);
    expect(getDailyResult("western-history", "2026-07-18")).toEqual(first);
  });

  it("restores an in-progress Daily Challenge and discards corrupt progress", () => {
    const progress = { index: 2, answers: [true, false], selectedFigureId: null };
    saveDailyProgress("western-history", "2026-07-18", progress);
    expect(getDailyProgress("western-history", "2026-07-18")).toEqual(progress);
    clearDailyProgress("western-history", "2026-07-18");
    expect(getDailyProgress("western-history", "2026-07-18")).toBeNull();
    localStorage.setItem("kiddle:v1:daily-progress:western-history:2026-07-18", '{"index":2,"answers":[true],"selectedFigureId":null}');
    expect(getDailyProgress("western-history", "2026-07-18")).toBeNull();
  });

  it("keeps Daily results separate by category", () => {
    const result = { score: 6, completedAt: "2026-07-18T00:00:00.000Z" };
    saveDailyResult("western-history", "2026-07-18", result);
    expect(getDailyResult("east-asian-history", "2026-07-18")).toBeNull();
  });
});
