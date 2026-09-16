import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { resolveQ8iDevAIHome } from "./q8idevai-home.js";
describe("resolveQ8iDevAIHome", () => {
  test("resolves Q8IDEVAI_HOME without creating it", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "q8idevai-home-parent-"));
    const q8idevaiHome = path.join(parent, "home");
    try {
      expect(resolveQ8iDevAIHome({ Q8IDEVAI_HOME: q8idevaiHome })).toBe(q8idevaiHome);
      expect(existsSync(q8idevaiHome)).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
