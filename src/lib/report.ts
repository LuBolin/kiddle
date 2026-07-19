export type ProblemType = "website" | "data";

export function buildGitHubIssueUrl(repository: string | undefined, type: ProblemType, description: string, page: string, context = ""): string | null {
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return null;
  const label = type === "data" ? "Data problem" : "Website problem";
  const body = [`## Problem type\n${label}`, context && `## Related figures\n${context}`, `## Description\n${description}`, `## Page\n${page}`].filter(Boolean).join("\n\n");
  return `https://github.com/${repository}/issues/new?${new URLSearchParams({ title: `${label}: ${description.slice(0, 70)}`, body })}`;
}
