import type { Figure, FigureText, Language } from "../types";

export function figureText(figure: Figure, language: Language): FigureText {
  const localized = figure.text[language];
  const fallback = figure.text.en;
  return {
    displayName: localized?.displayName || fallback.displayName,
    descriptor: localized?.descriptor || fallback.descriptor,
    countingRuleSummary: localized?.countingRuleSummary || fallback.countingRuleSummary,
    explanation: localized?.explanation || fallback.explanation,
    imageAlt: localized?.imageAlt || fallback.imageAlt,
  };
}
