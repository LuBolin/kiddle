import { describe, expect, it } from "vitest";
import { buildGitHubIssueUrl } from "./report";

describe("buildGitHubIssueUrl", () => {
  it("builds a prefilled GitHub issue and rejects an unconfigured repository", () => {
    expect(buildGitHubIssueUrl(undefined, "website", "Cards overlap", "http://localhost")).toBeNull();
    const url = new URL(buildGitHubIssueUrl("bloin/kiddle", "data", "The count is wrong", "https://kiddle.test/#daily", "Alice and Bob")!);
    expect(url.pathname).toBe("/bloin/kiddle/issues/new");
    expect(url.searchParams.get("title")).toBe("Data problem: The count is wrong");
    expect(url.searchParams.get("body")).toContain("Alice and Bob");
    expect(url.searchParams.get("body")).toContain("https://kiddle.test/#daily");
  });
});
