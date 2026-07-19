import { describe, expect, it } from "vitest";
import figuresData from "../data/western-history.json";
import { difficultyFor, generateChainedInfiniteQuestion, generateChainedQuickSession, generateInfiniteQuestion, generateQuickSession, isCorrect } from "./game";
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

  it("never pairs two revealed figures", () => {
    const first = generateInfiniteQuestion(figures, new Set(), () => 0)!;
    const seen = new Set([first.left.id, first.right.id]);
    const next = generateInfiniteQuestion(figures, seen, () => 0)!;
    expect([next.left, next.right].every((figure) => seen.has(figure.id))).toBe(false);
    expect(next.left.childrenCount).not.toBe(next.right.childrenCount);
  });

  it("carries the previous right figure into a chained match", () => {
    const first = generateInfiniteQuestion(figures, new Set(), () => 0)!;
    const seen = new Set([first.left.id, first.right.id]);
    const next = generateChainedInfiniteQuestion(figures, first.right.id, seen, () => 0)!;
    expect(next.left.id).toBe(first.right.id);
    expect(seen.has(next.right.id)).toBe(false);
  });

  it("builds a chained Quick session with each right figure carried forward", () => {
    const session = generateChainedQuickSession(figures, "quick-chain");
    expect(session).toHaveLength(10);
    expect(session.slice(1).every((question, index) => question.left.id === session[index].right.id)).toBe(true);
  });
});
