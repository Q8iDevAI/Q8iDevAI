import { describe, expect, it } from "vitest";
import {
  projectDisplayNameFromProjectId,
  projectIconPlaceholderLabelFromDisplayName,
} from "./project-display-name";

describe("projectDisplayNameFromProjectId", () => {
  it("shows owner and repo for GitHub remote ids", () => {
    expect(projectDisplayNameFromProjectId("remote:github.com/Q8iDevAI/Q8iDevAI")).toBe(
      "getq8idevai/q8idevai",
    );
  });

  it("shows the trailing directory name for local projects", () => {
    expect(projectDisplayNameFromProjectId("/Users/me/dev/q8idevai")).toBe("q8idevai");
  });
});

describe("projectIconPlaceholderLabelFromDisplayName", () => {
  it("uses repo name instead of owner for GitHub-style display names", () => {
    expect(projectIconPlaceholderLabelFromDisplayName("getq8idevai/q8idevai")).toBe("q8idevai");
  });

  it("returns the original display name when it has no path separator", () => {
    expect(projectIconPlaceholderLabelFromDisplayName("q8idevai")).toBe("q8idevai");
  });
});
