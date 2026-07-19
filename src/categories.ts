import type { CategoryId, Language } from "./types";

export const categories: Array<{ id: CategoryId; label: string; labelZh: string }> = [
  { id: "modern-celebrities", label: "Modern Celebrities", labelZh: "现代名人" },
  { id: "east-asian-history", label: "East Asian History", labelZh: "东亚历史" },
  { id: "east-asian-mythology", label: "East Asian Mythology", labelZh: "东亚神话" },
  { id: "western-history", label: "Western History", labelZh: "西方历史" },
  { id: "western-mythology", label: "Western Mythology", labelZh: "西方神话" },
];

export function categoryLabel(category: CategoryId, language: Language = "en"): string {
  const match = categories.find((candidate) => candidate.id === category);
  return language === "zh" ? match?.labelZh ?? category : match?.label ?? category;
}

export function categoryKey(pool: readonly CategoryId[]): string {
  return [...new Set(pool)].sort().join("+");
}

export function poolLabel(pool: readonly CategoryId[], language: Language = "en"): string {
  return pool.map((category) => categoryLabel(category, language)).join(" + ");
}
