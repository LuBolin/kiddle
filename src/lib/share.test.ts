import { describe, expect, it } from "vitest";
import { infiniteShareText } from "./share";

describe("Infinite sharing", () => {
  it("includes the cumulative score, best streak, and play link", () => {
    expect(infiniteShareText("Western History", 23, 10, "Score", "Best streak")).toContain("Score: 23\nBest streak: 10\n\nhttps://kid-dle.vercel.app");
  });
});
