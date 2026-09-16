import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyAttachmentFileToManagedStorage } from "./attachments";

const originalQ8iDevAIHome = process.env.Q8IDEVAI_HOME;
let testHome: string | null = null;

async function useTempQ8iDevAIHome(): Promise<string> {
  testHome = await mkdtemp(path.join(os.tmpdir(), "q8idevai-desktop-attachments-"));
  process.env.Q8IDEVAI_HOME = testHome;
  return testHome;
}

describe("desktop attachment files", () => {
  afterEach(async () => {
    if (originalQ8iDevAIHome === undefined) {
      delete process.env.Q8IDEVAI_HOME;
    } else {
      process.env.Q8IDEVAI_HOME = originalQ8iDevAIHome;
    }

    if (testHome) {
      await rm(testHome, { recursive: true, force: true });
      testHome = null;
    }
  });

  it("accepts dot-prefixed picker extensions for managed copies", async () => {
    const q8idevaiHome = await useTempQ8iDevAIHome();
    const sourcePath = path.join(q8idevaiHome, "report.md");
    await writeFile(sourcePath, "# Report\n");

    const result = await copyAttachmentFileToManagedStorage({
      attachmentId: "att_markdown",
      sourcePath,
      extension: ".md",
    });

    expect(result).toEqual({
      path: path.join(q8idevaiHome, "desktop-attachments", "att_markdown.md"),
      byteSize: 9,
    });
    await expect(readFile(result.path, "utf8")).resolves.toBe("# Report\n");
  });

  it("normalizes legacy bare extensions for managed copies", async () => {
    const q8idevaiHome = await useTempQ8iDevAIHome();
    const sourcePath = path.join(q8idevaiHome, "report.md");
    await writeFile(sourcePath, "# Report\n");

    const result = await copyAttachmentFileToManagedStorage({
      attachmentId: "att_markdown_legacy",
      sourcePath,
      extension: "md",
    });

    expect(result).toEqual({
      path: path.join(q8idevaiHome, "desktop-attachments", "att_markdown_legacy.md"),
      byteSize: 9,
    });
    await expect(readFile(result.path, "utf8")).resolves.toBe("# Report\n");
  });
});
