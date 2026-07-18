import { describe, expect, it } from "vitest";
import figuresData from "../data/western-history.json";
import { difficultyFor, generateInfiniteQuestion, generateQuickSession, isCorrect } from "./game";
import type { Figure } from "../types";

const figures = figuresData as Figure[];

describe("Quick Mode generation", () => {
  it("creates ten reproducible, non-tied questions without repeated figures", () => {
    const first = generateQuickSession(figures, "fixed-seed");
    const second = generateQuickSession(figures, "fixed-seed");
    expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id));
    expect(first).toHaveLength(10);
    expect(new Set(first.flatMap((question) => [question.left.id, question.right.id])).size).toBe(20);
    expect(first.every((question) => question.left.childrenCount !== question.right.childrenCount)).toBe(true);
  });

  it("uses count difference for difficulty and finds the greater count", () => {
    const low = figures.find((figure) => figure.childrenCount === 0)!;
    const high = figures.find((figure) => figure.childrenCount === 20)!;
    expect(difficultyFor(low, high)).toBe("easy");
    const question = { id: "test", left: low, right: high, difficulty: "easy" as const };
    expect(isCorrect(question, high.id)).toBe(true);
    expect(isCorrect(question, low.id)).toBe(false);
  });

  it("pairs a revealed figure only with a figure whose count is still hidden", () => {
    const first = generateInfiniteQuestion(figures, new Set(), () => 0)!;
    const seen = new Set([first.left.id, first.right.id]);
    const next = generateInfiniteQuestion(figures, seen, () => 0)!;
    const knownInNext = [next.left, next.right].filter((figure) => seen.has(figure.id));
    const newInNext = [next.left, next.right].filter((figure) => !seen.has(figure.id));
    expect(knownInNext).toHaveLength(1);
    expect(newInNext).toHaveLength(1);
    expect(next.left.childrenCount).not.toBe(next.right.childrenCount);
  });
});
