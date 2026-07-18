import type { Figure } from "../types";

const categoryFiles = import.meta.glob("./*.json", { eager: true, import: "default" });

export const figures = Object.values(categoryFiles).flat() as Figure[];
