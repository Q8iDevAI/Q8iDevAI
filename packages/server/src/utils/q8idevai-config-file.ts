import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  Q8iDevAIConfigRawSchema,
  type Q8iDevAIConfigRaw,
  type Q8iDevAIConfigRevision,
  type ProjectConfigRpcError,
} from "@q8idevai/protocol/q8idevai-config-schema";
export {
  Q8iDevAIConfigRevisionSchema,
  ProjectConfigRpcErrorSchema,
  type Q8iDevAIConfigRevision,
  type ProjectConfigRpcError,
} from "@q8idevai/protocol/q8idevai-config-schema";

export const Q8IDEVAI_CONFIG_FILE_NAME = "q8idevai.json";

export type ReadQ8iDevAIConfigForEditResult =
  | { ok: true; config: Q8iDevAIConfigRaw | null; revision: Q8iDevAIConfigRevision | null }
  | { ok: false; error: ProjectConfigRpcError };

export type WriteQ8iDevAIConfigForEditResult =
  | { ok: true; config: Q8iDevAIConfigRaw; revision: Q8iDevAIConfigRevision }
  | { ok: false; error: ProjectConfigRpcError };

export interface WriteQ8iDevAIConfigForEditInput {
  repoRoot: string;
  config: Q8iDevAIConfigRaw;
  expectedRevision: Q8iDevAIConfigRevision | null;
}

export function resolveQ8iDevAIConfigPath(repoRoot: string): string {
  return join(repoRoot, Q8IDEVAI_CONFIG_FILE_NAME);
}

export function statQ8iDevAIConfigPath(repoRoot: string): Q8iDevAIConfigRevision | null {
  const configPath = resolveQ8iDevAIConfigPath(repoRoot);
  if (!existsSync(configPath)) {
    return null;
  }
  const stats = statSync(configPath);
  return {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
  };
}

export function readQ8iDevAIConfigJson(repoRoot: string): unknown {
  const configPath = resolveQ8iDevAIConfigPath(repoRoot);
  if (!existsSync(configPath)) {
    return null;
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

export function readQ8iDevAIConfigForEdit(repoRoot: string): ReadQ8iDevAIConfigForEditResult {
  try {
    const json = readQ8iDevAIConfigJson(repoRoot);
    if (json === null) {
      return { ok: true, config: null, revision: null };
    }
    return {
      ok: true,
      config: Q8iDevAIConfigRawSchema.parse(json),
      revision: statQ8iDevAIConfigPath(repoRoot),
    };
  } catch {
    return {
      ok: false,
      error: { code: "invalid_project_config" },
    };
  }
}

export function writeQ8iDevAIConfigForEdit(
  input: WriteQ8iDevAIConfigForEditInput,
): WriteQ8iDevAIConfigForEditResult {
  const parsed = Q8iDevAIConfigRawSchema.safeParse(input.config);
  if (!parsed.success) {
    return { ok: false, error: { code: "invalid_project_config" } };
  }

  const configPath = resolveQ8iDevAIConfigPath(input.repoRoot);
  const tempPath = join(
    input.repoRoot,
    `.${Q8IDEVAI_CONFIG_FILE_NAME}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    writeFileSync(tempPath, `${JSON.stringify(parsed.data, null, 2)}\n`);
    const currentRevision = statQ8iDevAIConfigPath(input.repoRoot);
    if (!q8idevaiConfigRevisionsEqual(currentRevision, input.expectedRevision)) {
      removeTempQ8iDevAIConfig(tempPath);
      return {
        ok: false,
        error: { code: "stale_project_config", currentRevision },
      };
    }

    renameSync(tempPath, configPath);
    const revision = statQ8iDevAIConfigPath(input.repoRoot);
    if (!revision) {
      return { ok: false, error: { code: "write_failed" } };
    }
    return { ok: true, config: parsed.data, revision };
  } catch {
    removeTempQ8iDevAIConfig(tempPath);
    return { ok: false, error: { code: "write_failed" } };
  }
}

function q8idevaiConfigRevisionsEqual(
  left: Q8iDevAIConfigRevision | null,
  right: Q8iDevAIConfigRevision | null,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}

function removeTempQ8iDevAIConfig(tempPath: string): void {
  try {
    rmSync(tempPath, { force: true });
  } catch {
    // Best-effort cleanup only; callers need the original write outcome.
  }
}
