import { describe, expect, it } from "vitest";
import figuresData from "../data/western-history.json";
import type { Figure } from "../types";
import { dailyQuestionsForDate } from "./daily";

const figures = figuresData as Figure[];

describe("Daily Challenge", () => {
  it("uses the local date as a reproducible seed for ten non-tied questions", () => {
    const questions = dailyQuestionsForDate("2026-07-18", ["western-history"], figures);
    expect(questions).toHaveLength(10);
    expect(questions).toEqual(dailyQuestionsForDate("2026-07-18", ["western-history"], figures));
    expect(questions.every((question) => question.left.childrenCount !== question.right.childrenCount)).toBe(true);
  });

  it("changes the session when the date changes", () => {
    expect(dailyQuestionsForDate("2026-07-18", ["western-history"], figures).map((question) => question.id))
      .not.toEqual(dailyQuestionsForDate("2026-07-19", ["western-history"], figures).map((question) => question.id));
  });

  it("uses the category as part of the Daily seed", () => {
    expect(dailyQuestionsForDate("2026-07-18", ["western-history"], figures).map((question) => question.id))
      .not.toEqual(dailyQuestionsForDate("2026-07-18", ["western-history", "western-mythology"], figures).map((question) => question.id));
  });
});
