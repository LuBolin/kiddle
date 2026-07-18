import type { CategoryId } from "./types";

export const categories: Array<{ id: CategoryId; label: string }> = [
  { id: "modern-celebrities", label: "Modern Celebrities" },
  { id: "east-asian-history", label: "East Asian History" },
  { id: "east-asian-mythology", label: "East Asian Mythology" },
  { id: "western-history", label: "Western History" },
  { id: "western-mythology", label: "Western Mythology" },
];

export function categoryLabel(category: CategoryId): string {
  return categories.find((candidate) => candidate.id === category)?.label ?? category;
}
