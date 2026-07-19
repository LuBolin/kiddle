import { describe, expect, it } from "vitest";
import figuresData from "../data/western-history.json";
import modernFiguresData from "../data/modern-celebrities.json";
import type { Figure } from "../types";
import { dailyCategoryForDate, dailyQuestionsForDate } from "./daily";

const figures = figuresData as Figure[];
const modernFigures = modernFiguresData as Figure[];

describe("Daily Challenge", () => {
  it("uses the local date as a reproducible seed for ten non-tied questions", () => {
    const questions = dailyQuestionsForDate("2026-07-18", "western-history", figures);
    expect(questions).toHaveLength(10);
    expect(questions).toEqual(dailyQuestionsForDate("2026-07-18", "western-history", figures));
    expect(questions.every((question) => question.left.childrenCount !== question.right.childrenCount)).toBe(true);
    expect(questions.every((question) => question.left.category === "western-history" && question.right.category === "western-history")).toBe(true);
  });

  it("changes the session when the date changes", () => {
    expect(dailyQuestionsForDate("2026-07-18", "western-history", figures).map((question) => question.id))
      .not.toEqual(dailyQuestionsForDate("2026-07-19", "western-history", figures).map((question) => question.id));
  });

  it("selects one reproducible playable category before creating its questions", () => {
    const twoCategories = [...figures, ...modernFigures];
    const category = dailyCategoryForDate("2026-07-18", twoCategories);
    expect(category).toBe(dailyCategoryForDate("2026-07-18", twoCategories));
    expect(["western-history", "modern-celebrities"]).toContain(category);
    expect(new Set(Array.from({ length: 30 }, (_, day) => dailyCategoryForDate(`2026-08-${`${day + 1}`.padStart(2, "0")}`, twoCategories)))).toEqual(new Set(["western-history", "modern-celebrities"]));
  });
});
