import type { DaemonClient } from "@q8idevai/client/internal/daemon-client";
import type { Q8iDevAIApi } from "@q8idevai/client";
import { Q8iDevAIApiProvider } from "@q8idevai/plugin/client/host";
import { useQ8iDevAI } from "@q8idevai/plugin/client";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createPluginSurfaceRuntime } from "./surface-runtime";

function clientWithWorkspace(id: string) {
  const createWorkspace = vi.fn(async () => ({
    error: null,
    workspace: {
      id,
      projectId: `project-${id}`,
      workspaceDirectory: `/tmp/${id}`,
      name: id,
      status: "active",
    },
  }));
  const createAgent = vi.fn(async () => ({
    id: `agent-${id}`,
    provider: "codex",
    cwd: `/tmp/${id}`,
    workspaceId: id,
    status: "idle",
  }));
  const invokePluginRpc = vi.fn(async () => id);
  return {
    client: { createWorkspace, createAgent, invokePluginRpc } as unknown as DaemonClient,
    createWorkspace,
    createAgent,
    invokePluginRpc,
  };
}

function borrowFromAppProvider(q8idevai: Q8iDevAIApi): Q8iDevAIApi {
  let borrowed: Q8iDevAIApi | null = null;
  function PluginSurface() {
    borrowed = useQ8iDevAI();
    return null;
  }
  renderToStaticMarkup(
    <Q8iDevAIApiProvider q8idevai={q8idevai}>
      <PluginSurface />
    </Q8iDevAIApiProvider>,
  );
  if (!borrowed) throw new Error("Plugin surface did not receive Q8iDevAI API");
  return borrowed;
}

describe("plugin surface host runtime", () => {
  it("creates a PR worktree and agent through useQ8iDevAI on the selected app host", async () => {
    const selected = clientWithWorkspace("workspace-a");
    const runtime = createPluginSurfaceRuntime(selected.client, {
      id: "workspace-plugin",
      lifetime: new AbortController(),
    });
    if (!runtime) throw new Error("Expected selected host runtime");

    const q8idevai = borrowFromAppProvider(runtime.q8idevai);
    const workspace = await q8idevai.workspaces.create({
      source: {
        kind: "worktree",
        cwd: "/tmp/repository",
        action: "checkout",
        checkoutSource: { kind: "change_request", forge: "github", number: 42 },
      },
    });
    const agent = await workspace.agents.create({
      config: { provider: "codex/gpt-5" },
      prompt: "Review PR #42",
    });

    expect(workspace.id).toBe("workspace-a");
    expect(agent.id).toBe("agent-workspace-a");
    expect(selected.createWorkspace).toHaveBeenCalledOnce();
    expect(selected.createAgent).toHaveBeenCalledOnce();
  });

  it("switches all plugin calls when the selected host changes", async () => {
    const hostA = clientWithWorkspace("workspace-a");
    const hostB = clientWithWorkspace("workspace-b");
    const first = createPluginSurfaceRuntime(hostA.client, {
      id: "same-plugin",
      lifetime: new AbortController(),
    });
    const second = createPluginSurfaceRuntime(hostB.client, {
      id: "same-plugin",
      lifetime: new AbortController(),
    });
    if (!first || !second) throw new Error("Expected online host runtimes");

    await first.invoke("host", {});
    await borrowFromAppProvider(second.q8idevai).workspaces.create({
      source: { kind: "directory", path: "/tmp/workspace-b" },
    });

    expect(hostA.invokePluginRpc).toHaveBeenCalledWith("same-plugin", "host", {});
    expect(hostA.createWorkspace).not.toHaveBeenCalled();
    expect(hostB.createWorkspace).toHaveBeenCalledOnce();
  });

  it("keeps an offline selected host unavailable instead of borrowing another host", () => {
    const otherHost = clientWithWorkspace("workspace-online");

    expect(
      createPluginSurfaceRuntime(null, { id: "same-plugin", lifetime: new AbortController() }),
    ).toBeNull();
    expect(otherHost.createWorkspace).not.toHaveBeenCalled();
  });
});
