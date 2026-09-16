import { z } from "zod";
import type { DaemonClient } from "../daemon-client.js";

const TerminalSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  cwd: z.string(),
  name: z.string(),
});

export type Q8iDevAITerminal = z.infer<typeof TerminalSchema>;

export interface Q8iDevAITerminalCreateOptions {
  workspaceId: string;
  /** Process working directory; defaults to the workspace directory. */
  cwd?: string;
  name?: string;
  command?: string;
  args?: string[];
  size?: { rows: number; cols: number };
  requestId?: string;
}

export interface Q8iDevAITerminalListOptions {
  /** Ownership filter. When supplied, cwd does not restrict the results. */
  workspaceId?: string;
  /** Workspace root directory filter for unscoped listings. */
  cwd?: string;
  requestId?: string;
}

export interface Q8iDevAITerminalListResult {
  entries: Q8iDevAITerminal[];
  requestId: string;
}

export interface Q8iDevAITerminalCaptureOptions {
  start?: number;
  end?: number;
  stripAnsi?: boolean;
  requestId?: string;
}

export type Q8iDevAITerminalCaptureResult = Awaited<ReturnType<DaemonClient["captureTerminal"]>>;

export interface Q8iDevAITerminalHandle {
  readonly id: string;
  current(): Q8iDevAITerminal | null;
  refresh(options?: { requestId?: string }): Promise<Q8iDevAITerminal | null>;
  /** Sends literal input and returns its UTF-16 length. Does not await command execution. */
  write(data: string): number;
  /** Expands CLI key tokens; other strings are literal. Returns the input's UTF-16 length. */
  sendKeys(keys: readonly string[]): number;
  capture(options?: Q8iDevAITerminalCaptureOptions): Promise<Q8iDevAITerminalCaptureResult>;
  kill(requestId?: string): Promise<void>;
}

export interface Q8iDevAITerminalActions {
  create(options: Q8iDevAITerminalCreateOptions): Promise<Q8iDevAITerminalHandle>;
  list(options?: Q8iDevAITerminalListOptions): Promise<Q8iDevAITerminalListResult>;
  ref(terminal: string | Q8iDevAITerminal): Q8iDevAITerminalHandle;
}

export interface Q8iDevAIWorkspaceTerminalActions {
  create(options?: Omit<Q8iDevAITerminalCreateOptions, "workspaceId">): Promise<Q8iDevAITerminalHandle>;
  list(options?: { requestId?: string }): Promise<Q8iDevAITerminalListResult>;
}

type TerminalClient = Pick<
  DaemonClient,
  | "ensureConnected"
  | "getLastServerInfoMessage"
  | "createTerminal"
  | "listTerminals"
  | "sendTerminalInput"
  | "captureTerminal"
  | "killTerminal"
>;

/** @package */
export function createTerminalActions(
  daemonClient: TerminalClient,
  resolveWorkspaceDirectory: (workspaceId: string) => Promise<string>,
): Q8iDevAITerminalActions {
  function client(): TerminalClient {
    daemonClient.ensureConnected();
    // COMPAT(workspaceTerminals): added in v0.7.3, remove gate after 2027-09-05.
    if (daemonClient.getLastServerInfoMessage()?.features?.workspaceTerminals !== true) {
      throw new Error("Update the host to use workspace terminals through the SDK.");
    }
    return daemonClient;
  }

  const list = async (options: Q8iDevAITerminalListOptions = {}): Promise<Q8iDevAITerminalListResult> => {
    const result = await client().listTerminals(options.cwd, options.requestId, {
      workspaceId: options.workspaceId,
    });
    return {
      entries: result.terminals.map((terminal) => TerminalSchema.parse(terminal)),
      requestId: result.requestId,
    };
  };

  const ref = (terminal: string | Q8iDevAITerminal): Q8iDevAITerminalHandle => {
    const id = typeof terminal === "string" ? terminal : terminal.id;
    let current = typeof terminal === "string" ? null : terminal;
    const write = (data: string): number => {
      client().sendTerminalInput(id, { type: "input", data });
      return data.length;
    };
    return {
      id,
      current: () => current,
      refresh: async (options) => {
        const result = await list(options);
        current = result.entries.find((entry) => entry.id === id) ?? null;
        return current;
      },
      write,
      sendKeys: (keys) => write(keys.map(resolveKeyToken).join("")),
      capture: (options = {}) => {
        const { requestId, ...captureOptions } = options;
        return client().captureTerminal(id, captureOptions, requestId);
      },
      kill: async (requestId) => {
        const result = await client().killTerminal(id, requestId);
        if (!result.success) throw new Error(`Failed to kill terminal ${id}`);
        current = null;
      },
    };
  };

  return {
    create: async ({ workspaceId, cwd, name, requestId, ...options }) => {
      const driver = client();
      if (!workspaceId) throw new Error("workspaceId is required");
      const directory = cwd ?? (await resolveWorkspaceDirectory(workspaceId));
      const result = await driver.createTerminal(directory, name, requestId, {
        ...options,
        workspaceId,
      });
      if (result.error || !result.terminal) {
        throw new Error(result.error ?? "The daemon did not create a terminal");
      }
      return ref(TerminalSchema.parse(result.terminal));
    },
    list,
    ref,
  };
}

function resolveKeyToken(key: string): string {
  switch (key) {
    case "Enter":
      return "\r";
    case "Tab":
      return "\t";
    case "Escape":
      return "\u001b";
    case "Space":
      return " ";
    case "BSpace":
      return "\u007f";
    case "C-c":
      return "\u0003";
    case "C-d":
      return "\u0004";
    case "C-z":
      return "\u001a";
    case "C-l":
      return "\u000c";
    case "C-a":
      return "\u0001";
    case "C-e":
      return "\u0005";
    default:
      return key;
  }
}
