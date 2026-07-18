import { describe, expect, it } from "vitest";
import figuresData from "../data/western-history.json";
import type { Figure } from "../types";
import { dailyCategoryForDate, dailyQuestionsForDate } from "./daily";

const figures = figuresData as Figure[];

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
    const twoCategories = [...figures, ...figures.map((figure) => ({ ...figure, id: `myth-${figure.id}`, category: "western-mythology" as const }))];
    const category = dailyCategoryForDate("2026-07-18", twoCategories);
    expect(category).toBe(dailyCategoryForDate("2026-07-18", twoCategories));
    expect(["western-history", "western-mythology"]).toContain(category);
  });
});
