export type CategoryId =
  | "modern-celebrities"
  | "east-asian-history"
  | "east-asian-mythology"
  | "western-history"
  | "western-mythology";
export type Difficulty = "easy" | "medium" | "hard";
export type Language = "en" | "zh";

export interface Source {
  title: string;
  url: string;
  note?: string;
}

export interface FigureText {
  displayName: string;
  descriptor: string;
  countingRuleSummary: string;
  explanation: string;
  imageAlt: string;
}

export interface Figure {
  id: string;
  category: CategoryId;
  tags: string[];
  childrenCount: number;
  countType: "exact" | "commonly-recorded" | "editorial-standard";
  confidence: "high" | "medium";
  recognisabilityScore: 1 | 2 | 3 | 4 | 5;
  status: "active" | "disabled" | "excluded";
  image: {
    url: string;
    licence: string;
    attribution: string;
    sourceUrl: string;
  };
  sources: Source[];
  text: {
    en: FigureText;
    zh: FigureText;
  };
}

export interface Question {
  id: string;
  left: Figure;
  right: Figure;
  difficulty: Difficulty;
}
