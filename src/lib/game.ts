import type { Difficulty, Figure, Question } from "../types";

const targetDifficulties: Difficulty[] = [
  "easy", "easy", "easy", "medium", "medium", "medium", "medium", "hard", "hard", "hard",
];

export function difficultyFor(left: Figure, right: Figure): Difficulty {
  const difference = Math.abs(left.childrenCount - right.childrenCount);
  if (difference === 1) return "hard";
  if (difference <= 3) return "medium";
  return "easy";
}

function random(seed?: string): () => number {
  let value = 1779033703;
  for (const character of seed ?? `${Math.random()}`) {
    value = Math.imul(value ^ character.charCodeAt(0), 3432918353);
    value = (value << 13) | (value >>> 19);
  }
  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    return ((value ^= value >>> 16) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], nextRandom: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function generateQuickSession(figures: Figure[], seed?: string): Question[] {
  const active = figures.filter((figure) => figure.status === "active");
  const nextRandom = random(seed);
  const candidates: Question[] = [];

  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
      const left = active[leftIndex];
      const right = active[rightIndex];
      if (left.childrenCount === right.childrenCount) continue;
      candidates.push({
        id: [left.id, right.id].sort().join("--"),
        left,
        right,
        difficulty: difficultyFor(left, right),
      });
    }
  }

  const usedFigures = new Set<string>();
  const selected: Question[] = [];
  for (const target of targetDifficulties) {
    const available = shuffled(candidates, nextRandom).filter(
      (question) =>
        !usedFigures.has(question.left.id) &&
        !usedFigures.has(question.right.id),
    );
    const question = available.find((candidate) => candidate.difficulty === target) ?? available[0];
    if (!question) throw new Error("Not enough distinct figures for a ten-question session.");
    selected.push(question);
    usedFigures.add(question.left.id);
    usedFigures.add(question.right.id);
  }

  return shuffled(selected, nextRandom).map((question, index) => ({
    ...question,
    id: `quick-${index + 1}-${question.id}`,
  }));
}

export function generateInfiniteQuestion(figures: Figure[], seenFigureIds: ReadonlySet<string>, nextRandom = Math.random): Question | null {
  const active = figures.filter((figure) => figure.status === "active");
  const unseen = active.filter((figure) => !seenFigureIds.has(figure.id));
  if (unseen.length === 0) return null;

  const known = active.filter((figure) => seenFigureIds.has(figure.id));
  const candidates = known.length === 0
    ? active.flatMap((left, leftIndex) => active.slice(leftIndex + 1).map((right) => ({ left, right })))
    : known.flatMap((left) => unseen.map((right) => ({ left, right })));
  const playable = candidates.filter(({ left, right }) => left.childrenCount !== right.childrenCount);
  const pool = playable.length > 0
    ? playable
    : unseen.flatMap((left, leftIndex) => unseen.slice(leftIndex + 1).map((right) => ({ left, right }))).filter(({ left, right }) => left.childrenCount !== right.childrenCount);
  if (pool.length === 0) return null;

  const { left, right } = pool[Math.floor(nextRandom() * pool.length)];
  return {
    id: `infinite-${[left.id, right.id].sort().join("--")}`,
    left,
    right,
    difficulty: difficultyFor(left, right),
  };
}

export function isCorrect(question: Question, selectedFigureId: string): boolean {
  const winner = question.left.childrenCount > question.right.childrenCount ? question.left : question.right;
  return winner.id === selectedFigureId;
}
