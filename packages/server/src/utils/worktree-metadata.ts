import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { z } from "zod";

const ChangeRequestLookupTargetSchema = z.object({
  headRef: z.string().min(1),
  headRepositoryOwner: z.string().min(1).optional(),
  changeRequestNumber: z.number().int().positive().optional(),
  localBranchName: z.string().min(1).optional(),
});

// baseRefName is the display name; baseRef is the exact ref the worktree was cut from
// ("refs/remotes/upstream/main"). baseRef is optional because worktrees written before it
// existed only have the name — there are no migrations, so readers fall back.
const Q8iDevAIWorktreeMetadataV1Schema = z.object({
  version: z.literal(1),
  baseRefName: z.string().min(1),
  baseRef: z.string().min(1).optional(),
  changeRequestLookupTarget: ChangeRequestLookupTargetSchema.optional(),
});

const Q8iDevAIWorktreeMetadataV2Schema = z.object({
  version: z.literal(2),
  baseRefName: z.string().min(1),
  baseRef: z.string().min(1).optional(),
  changeRequestLookupTarget: ChangeRequestLookupTargetSchema.optional(),
  firstAgentBranchAutoName: z
    .discriminatedUnion("status", [
      z.object({
        status: z.literal("pending"),
        placeholderBranchName: z.string().min(1),
      }),
      z.object({
        status: z.literal("attempted"),
        placeholderBranchName: z.string().min(1),
        attemptedAt: z.string().min(1),
      }),
    ])
    .optional(),
  runtime: z
    .object({
      worktreePort: z.number().int().positive(),
    })
    .optional(),
});

const Q8iDevAIWorktreeMetadataSchema = z.union([
  Q8iDevAIWorktreeMetadataV1Schema,
  Q8iDevAIWorktreeMetadataV2Schema,
]);

export type Q8iDevAIWorktreeMetadata = z.infer<typeof Q8iDevAIWorktreeMetadataSchema>;
export type Q8iDevAIWorktreeChangeRequestHint = z.infer<typeof ChangeRequestLookupTargetSchema>;

export function createQ8iDevAIWorktreeChangeRequestHint(
  input: Q8iDevAIWorktreeChangeRequestHint,
): Q8iDevAIWorktreeChangeRequestHint {
  return ChangeRequestLookupTargetSchema.parse(input);
}

export function getQ8iDevAIWorktreeChangeRequestHintForBranch(
  metadata: Q8iDevAIWorktreeMetadata | null,
  currentBranch: string,
): Q8iDevAIWorktreeChangeRequestHint | null {
  const target = metadata?.changeRequestLookupTarget;
  if (!target) {
    return null;
  }
  if (target.localBranchName) {
    return target.localBranchName === currentBranch ? target : null;
  }

  // COMPAT(change-request-local-branch): metadata before v0.2.5 omitted the
  // local binding; remove after 2027-07-31.
  const canonicalBranches = new Set<string>();
  if (target.headRepositoryOwner) {
    canonicalBranches.add(`${target.headRepositoryOwner}/${target.headRef}`);
    const normalizedOwner = normalizeLegacyGitHubOwnerForBranch(target.headRepositoryOwner);
    if (normalizedOwner) {
      canonicalBranches.add(`${normalizedOwner}/${target.headRef}`);
    }
  } else {
    canonicalBranches.add(target.headRef);
  }
  return canonicalBranches.has(currentBranch) ? target : null;
}

function normalizeLegacyGitHubOwnerForBranch(owner: string): string | null {
  const normalized = owner.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : null;
}

export function rebindQ8iDevAIWorktreeChangeRequestHint(
  worktreeRoot: string,
  previousBranch: string,
  currentBranch: string,
): boolean {
  const metadata = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  const target = getQ8iDevAIWorktreeChangeRequestHintForBranch(metadata, previousBranch);
  if (!metadata || !target) {
    return false;
  }

  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, {
    ...metadata,
    changeRequestLookupTarget: {
      ...target,
      ...(target.headRef === previousBranch &&
      !target.headRepositoryOwner &&
      target.changeRequestNumber === undefined
        ? { headRef: currentBranch }
        : {}),
      localBranchName: currentBranch,
    },
  });
  return true;
}

export function pinQ8iDevAIWorktreeBranchIdentityIfMissing(
  worktreeRoot: string,
  branch: string,
): boolean {
  const metadata = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!metadata || metadata.changeRequestLookupTarget) {
    return false;
  }
  const target = createQ8iDevAIWorktreeChangeRequestHint({
    headRef: branch,
    localBranchName: branch,
  });
  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, {
    ...metadata,
    changeRequestLookupTarget: target,
  });
  return true;
}

function getGitDirForWorktreeRoot(worktreeRoot: string): string {
  const gitPath = join(worktreeRoot, ".git");
  if (!existsSync(gitPath)) {
    throw new Error(`Not a git repository: ${worktreeRoot}`);
  }

  // In a worktree checkout, `.git` is a file containing `gitdir: <path>`.
  // In a normal checkout, `.git` is a directory.
  try {
    const gitFileContent = readFileSync(gitPath, "utf8");
    const match = gitFileContent.match(/gitdir:\s*(.+)/);
    if (match?.[1]) {
      const raw = match[1].trim();
      return isAbsolute(raw) ? raw : resolve(worktreeRoot, raw);
    }
  } catch {
    // If `.git` is a directory, readFileSync will throw; fall through.
  }

  return gitPath;
}

export function getQ8iDevAIWorktreeMetadataPath(worktreeRoot: string): string {
  const gitDir = getGitDirForWorktreeRoot(worktreeRoot);
  return join(gitDir, "q8idevai", "worktree.json");
}

const REMOTE_TRACKING_PREFIX = "refs/remotes/";

/**
 * The human-readable branch name behind a ref. Display and legacy identity only — it cannot
 * round-trip, so anything that has to resolve to a commit keeps the exact ref instead.
 *
 * refs/remotes/<remote>/<branch> works for any remote, not just origin. Git allows slashes in
 * remote names, so refs/remotes/a/b/c is ambiguous and the first segment is read as the
 * remote: slashes are everywhere in branch names and rare in remote names. A remote genuinely
 * named "team/upstream" therefore displays as "upstream/main" rather than "main"; the exact
 * ref is unaffected, which is why this is display-only.
 */
export function branchNameFromRef(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith("refs/heads/")) {
    return trimmed.slice("refs/heads/".length);
  }
  if (trimmed.startsWith(REMOTE_TRACKING_PREFIX)) {
    const remainder = trimmed.slice(REMOTE_TRACKING_PREFIX.length);
    const separator = remainder.indexOf("/");
    return separator === -1 ? remainder : remainder.slice(separator + 1);
  }
  // Short form. It cannot be generalized to any remote the way the qualified form can:
  // without the remote list, "feature/x" is indistinguishable from "<remote>/x".
  if (trimmed.startsWith("origin/")) {
    return trimmed.slice("origin/".length);
  }
  return trimmed;
}

export function normalizeBaseRefName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Base branch is required");
  }
  return branchNameFromRef(trimmed);
}

function assertValidBaseRef(value: string): void {
  if (value === "HEAD") {
    throw new Error("Base branch cannot be HEAD");
  }
  if (value.includes("..") || value.includes("@{")) {
    throw new Error(`Invalid base branch: ${value}`);
  }
}

export function writeQ8iDevAIWorktreeMetadata(
  worktreeRoot: string,
  options: {
    baseRefName: string;
    baseRef?: string;
    changeRequestLookupTarget?: Q8iDevAIWorktreeChangeRequestHint;
  },
): void {
  const baseRefName = normalizeBaseRefName(options.baseRefName);
  assertValidBaseRef(baseRefName);
  const baseRef = options.baseRef?.trim();
  if (baseRef) {
    assertValidBaseRef(baseRef);
  }

  const metadata: Q8iDevAIWorktreeMetadata = {
    version: 1,
    baseRefName,
    ...(baseRef ? { baseRef } : {}),
    ...(options.changeRequestLookupTarget
      ? { changeRequestLookupTarget: options.changeRequestLookupTarget }
      : {}),
  };
  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, metadata);
}

export function writeQ8iDevAIWorktreeRuntimeMetadata(
  worktreeRoot: string,
  options: { worktreePort: number },
): void {
  if (!Number.isInteger(options.worktreePort) || options.worktreePort <= 0) {
    throw new Error(`Invalid worktree runtime port: ${options.worktreePort}`);
  }

  const current = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!current) {
    throw new Error("Cannot persist worktree runtime metadata: missing base metadata");
  }

  const next: Q8iDevAIWorktreeMetadata = {
    ...current,
    version: 2,
    runtime: {
      worktreePort: options.worktreePort,
    },
  };
  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, next);
}

export function writeQ8iDevAIWorktreeFirstAgentBranchAutoNameMetadata(
  worktreeRoot: string,
  options: { placeholderBranchName: string },
): void {
  const placeholderBranchName = options.placeholderBranchName.trim();
  if (!placeholderBranchName) {
    throw new Error("Placeholder branch name is required");
  }

  const current = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!current) {
    throw new Error("Cannot persist first-agent branch auto-name metadata: missing base metadata");
  }

  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, {
    ...current,
    version: 2,
    firstAgentBranchAutoName: {
      status: "pending",
      placeholderBranchName,
    },
  });
}

export function markQ8iDevAIWorktreeFirstAgentBranchAutoNameAttempted(
  worktreeRoot: string,
  options: { attemptedAt?: string } = {},
): Q8iDevAIWorktreeMetadata | null {
  const current = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!current || current.version !== 2 || current.firstAgentBranchAutoName?.status !== "pending") {
    return current;
  }

  const next: Q8iDevAIWorktreeMetadata = {
    ...current,
    firstAgentBranchAutoName: {
      status: "attempted",
      placeholderBranchName: current.firstAgentBranchAutoName.placeholderBranchName,
      attemptedAt: options.attemptedAt ?? new Date().toISOString(),
    },
  };
  writeQ8iDevAIWorktreeMetadataFile(worktreeRoot, next);
  return next;
}

export function readQ8iDevAIWorktreeMetadata(worktreeRoot: string): Q8iDevAIWorktreeMetadata | null {
  const metadataPath = getQ8iDevAIWorktreeMetadataPath(worktreeRoot);
  if (!existsSync(metadataPath)) {
    return null;
  }
  const parsed = JSON.parse(readFileSync(metadataPath, "utf8"));
  return Q8iDevAIWorktreeMetadataSchema.parse(parsed);
}

export function requireQ8iDevAIWorktreeBaseRefName(worktreeRoot: string): string {
  const metadataPath = getQ8iDevAIWorktreeMetadataPath(worktreeRoot);
  const metadata = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!metadata) {
    throw new Error(`Missing Q8iDevAI worktree base metadata: ${metadataPath}`);
  }
  return metadata.baseRefName;
}

export function readQ8iDevAIWorktreeRuntimePort(worktreeRoot: string): number | null {
  const metadata = readQ8iDevAIWorktreeMetadata(worktreeRoot);
  if (!metadata) {
    return null;
  }
  if (metadata.version === 2 && metadata.runtime?.worktreePort) {
    return metadata.runtime.worktreePort;
  }
  return null;
}

function writeQ8iDevAIWorktreeMetadataFile(
  worktreeRoot: string,
  metadata: Q8iDevAIWorktreeMetadata,
): void {
  const metadataPath = getQ8iDevAIWorktreeMetadataPath(worktreeRoot);
  mkdirSync(join(getGitDirForWorktreeRoot(worktreeRoot), "q8idevai"), { recursive: true });
  const tempPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  renameSync(tempPath, metadataPath);
}
