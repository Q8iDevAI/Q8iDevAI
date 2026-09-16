import { join } from "node:path";

import { getQ8iDevAIWorktreesRoot, isQ8iDevAIOwnedWorktreeCwd } from "../../utils/worktree.js";
import {
  archiveByScope,
  resolveWorkspaceIdAtPath,
  type ArchiveDependencies,
  type ArchiveScope,
} from "../workspace-archive-service.js";
import type {
  CreateQ8iDevAIWorktreeInput,
  CreateQ8iDevAIWorktreeResult,
} from "../q8idevai-worktree-service.js";
import { toWorktreeWireError, type WorktreeWireError } from "../worktree-errors.js";
import type { WorkspaceGitService, WorkspaceGitWorktreeInfo } from "../workspace-git-service.js";

export interface ListQ8iDevAIWorktreesCommandDependencies {
  workspaceGitService: Pick<WorkspaceGitService, "listWorktrees">;
}

export interface ListQ8iDevAIWorktreesCommandInput {
  cwd: string;
  reason?: string;
}

export async function listQ8iDevAIWorktreesCommand(
  dependencies: ListQ8iDevAIWorktreesCommandDependencies,
  input: ListQ8iDevAIWorktreesCommandInput,
): Promise<WorkspaceGitWorktreeInfo[]> {
  if (input.reason) {
    return dependencies.workspaceGitService.listWorktrees(input.cwd, { reason: input.reason });
  }
  return dependencies.workspaceGitService.listWorktrees(input.cwd);
}

type CreateQ8iDevAIWorktreeWorkflow<Result extends CreateQ8iDevAIWorktreeResult> = (
  input: CreateQ8iDevAIWorktreeInput,
) => Promise<Result>;

export interface CreateQ8iDevAIWorktreeCommandDependencies<
  Result extends CreateQ8iDevAIWorktreeResult = CreateQ8iDevAIWorktreeResult,
> {
  q8idevaiHome?: string;
  worktreesRoot?: string;
  createQ8iDevAIWorktreeWorkflow?: CreateQ8iDevAIWorktreeWorkflow<Result>;
}

export type CreateQ8iDevAIWorktreeCommandInput = Omit<
  CreateQ8iDevAIWorktreeInput,
  "q8idevaiHome" | "runSetup"
> & {
  q8idevaiHome?: string;
  worktreesRoot?: string;
};

export type CreateQ8iDevAIWorktreeCommandResult<Result extends CreateQ8iDevAIWorktreeResult> =
  | {
      ok: true;
      createdWorktree: Result;
    }
  | {
      ok: false;
      error: WorktreeWireError;
      cause: unknown;
    };

export async function createQ8iDevAIWorktreeCommand<Result extends CreateQ8iDevAIWorktreeResult>(
  dependencies: CreateQ8iDevAIWorktreeCommandDependencies<Result>,
  input: CreateQ8iDevAIWorktreeCommandInput,
): Promise<CreateQ8iDevAIWorktreeCommandResult<Result>> {
  try {
    if (!dependencies.createQ8iDevAIWorktreeWorkflow) {
      throw new Error("Q8iDevAI worktree service is not configured");
    }

    const createdWorktree = await dependencies.createQ8iDevAIWorktreeWorkflow({
      ...input,
      runSetup: false,
      q8idevaiHome: input.q8idevaiHome ?? dependencies.q8idevaiHome,
      worktreesRoot: input.worktreesRoot ?? dependencies.worktreesRoot,
    });
    return { ok: true, createdWorktree };
  } catch (error) {
    return {
      ok: false,
      error: toWorktreeWireError(error),
      cause: error,
    };
  }
}

export interface ArchiveCommandDependencies extends Omit<
  ArchiveDependencies,
  "workspaceGitService"
> {
  workspaceGitService: Pick<WorkspaceGitService, "getSnapshot" | "listWorktrees">;
}

export interface ArchiveCommandInput {
  requestId: string;
  repoRoot?: string | null;
  worktreePath?: string;
  worktreeSlug?: string;
  branchName?: string;
  workspaceId?: string;
  scope?: ArchiveScope["kind"];
}

export type ArchiveCommandResult =
  | {
      ok: true;
      removedAgents: string[];
    }
  | {
      ok: false;
      code: "NOT_ALLOWED";
      message: string;
      removedAgents: [];
    };

export async function archiveCommand(
  dependencies: ArchiveCommandDependencies,
  input: ArchiveCommandInput,
): Promise<ArchiveCommandResult> {
  const targetPath = await resolveArchiveTarget(dependencies, input);
  const scope = input.scope ?? "workspace";
  const ownership = await isQ8iDevAIOwnedWorktreeCwd(targetPath, {
    q8idevaiHome: dependencies.q8idevaiHome,
    worktreesRoot: dependencies.q8idevaiWorktreesBaseRoot,
  });

  if (scope === "worktree") {
    if (!ownership.allowed) {
      return {
        ok: false,
        code: "NOT_ALLOWED",
        message: "Worktree is not a Q8iDevAI-owned worktree",
        removedAgents: [],
      };
    }

    const result = await archiveByScope(dependencies, {
      scope: { kind: "worktree", targetPath },
      requestId: input.requestId,
    });

    return {
      ok: true,
      removedAgents: result.archivedAgentIds,
    };
  }

  const workspaceId =
    input.workspaceId ?? (await resolveWorkspaceIdAtPath(dependencies, targetPath));

  if (!workspaceId) {
    dependencies.sessionLogger?.warn(
      { targetPath },
      "Could not resolve workspace for archive; skipping",
    );
    return {
      ok: true,
      removedAgents: [],
    };
  }

  const result = await archiveByScope(dependencies, {
    scope: { kind: "workspace", workspaceId },
    requestId: input.requestId,
  });

  return {
    ok: true,
    removedAgents: result.archivedAgentIds,
  };
}

async function resolveArchiveTarget(
  dependencies: ArchiveCommandDependencies,
  input: ArchiveCommandInput,
): Promise<string> {
  const repoRoot = input.repoRoot ?? null;
  if (input.worktreePath) {
    return input.worktreePath;
  }

  if (input.worktreeSlug) {
    if (!repoRoot) {
      throw new Error("repoRoot is required when worktreeSlug is supplied");
    }
    return resolveWorktreeSlugPath(dependencies, repoRoot, input.worktreeSlug);
  }

  if (repoRoot && input.branchName) {
    const worktrees = await dependencies.workspaceGitService.listWorktrees(repoRoot);
    const match = worktrees.find((entry) => entry.branchName === input.branchName);
    if (!match) {
      throw new Error(`Q8iDevAI worktree not found for branch ${input.branchName}`);
    }
    return match.path;
  }

  throw new Error("worktreePath, worktreeSlug, or repoRoot+branchName is required");
}

async function resolveWorktreeSlugPath(
  dependencies: ArchiveCommandDependencies,
  repoRoot: string,
  worktreeSlug: string,
): Promise<string> {
  const worktreesRoot = await getQ8iDevAIWorktreesRoot(
    repoRoot,
    dependencies.q8idevaiHome,
    dependencies.q8idevaiWorktreesBaseRoot,
  );
  return join(worktreesRoot, worktreeSlug);
}
