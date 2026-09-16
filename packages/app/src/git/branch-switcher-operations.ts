import type { DaemonClient } from "@q8idevai/client/internal/daemon-client";

// Binds the branch switcher's git operations to a single workspace directory, so a
// workspace id can never be passed where a cwd is expected. `cwd` is set once here;
// callers choose the operation, never the directory.
export function createBranchSwitcherOperations(client: DaemonClient, cwd: string) {
  return {
    getBranchSuggestions: (limit: number) => client.getBranchSuggestions({ cwd, limit }),
    listQ8iDevAIStashes: () => client.stashList(cwd, { q8idevaiOnly: true }),
    saveStash: (branch: string | undefined) => client.stashSave(cwd, { branch }),
    popStash: (stashIndex: number) => client.stashPop(cwd, stashIndex),
    switchBranch: (branch: string) => client.checkoutSwitchBranch(cwd, branch),
  };
}

export type BranchSwitcherOperations = ReturnType<typeof createBranchSwitcherOperations>;
