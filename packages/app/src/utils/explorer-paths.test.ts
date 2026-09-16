import { describe, expect, it } from "vitest";
import { buildAbsoluteExplorerPath } from "./explorer-paths";

describe("buildAbsoluteExplorerPath", () => {
  it("builds a POSIX absolute path from a relative explorer path", () => {
    expect(
      buildAbsoluteExplorerPath({
        workspaceRoot: "/workspaces/q8idevai",
        entryPath: "packages/app/src/components/file-explorer-pane.tsx",
      }),
    ).toBe("/workspaces/q8idevai/packages/app/src/components/file-explorer-pane.tsx");
  });

  it("returns workspace root when entry path points to explorer root", () => {
    expect(
      buildAbsoluteExplorerPath({
        workspaceRoot: "/workspaces/q8idevai",
        entryPath: ".",
      }),
    ).toBe("/workspaces/q8idevai");
  });

  it("trims trailing separators from workspace root before joining", () => {
    expect(
      buildAbsoluteExplorerPath({
        workspaceRoot: "/workspaces/q8idevai/",
        entryPath: "README.md",
      }),
    ).toBe("/workspaces/q8idevai/README.md");
  });

  it("builds a Windows absolute path with backslash separators", () => {
    expect(
      buildAbsoluteExplorerPath({
        workspaceRoot: "C:\\repo\\q8idevai",
        entryPath: "packages/app/src/components/file-explorer-pane.tsx",
      }),
    ).toBe("C:\\repo\\q8idevai\\packages\\app\\src\\components\\file-explorer-pane.tsx");
  });

  it("passes through an already-absolute entry path", () => {
    expect(
      buildAbsoluteExplorerPath({
        workspaceRoot: "/workspaces/q8idevai",
        entryPath: "/tmp/another/location.txt",
      }),
    ).toBe("/tmp/another/location.txt");
  });
});
