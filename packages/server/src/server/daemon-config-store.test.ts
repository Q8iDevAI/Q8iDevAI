import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { DaemonConfigStore, applyMutableProviderConfigToOverrides } from "./daemon-config-store.js";
import { loadPersistedConfig } from "./persisted-config.js";
import type { PersistedConfig } from "./persisted-config.js";
import type { MutableDaemonConfig } from "@q8idevai/protocol/messages";

function reloadableConfig(
  persisted: PersistedConfig,
  options: { relayEnabledFallback?: boolean } = {},
): MutableDaemonConfig {
  const daemon = persisted.daemon ?? {};
  const relay = daemon.relay ?? {};
  const git = daemon.git ?? {};
  const agents = persisted.agents ?? {};
  return {
    relay: {
      enabled: relay.enabled ?? options.relayEnabledFallback ?? true,
    },
    mcp: { enabled: true, injectIntoAgents: false },
    browserTools: { enabled: daemon.browserTools?.enabled ?? false },
    providers: (agents.providers ?? {}) as MutableDaemonConfig["providers"],
    metadataGeneration: { providers: agents.metadataGeneration?.providers ?? [] },
    autoArchiveAfterMerge: daemon.autoArchiveAfterMerge ?? false,
    enableTerminalAgentHooks: daemon.enableTerminalAgentHooks ?? false,
    appendSystemPrompt: daemon.appendSystemPrompt ?? "",
    terminalProfiles: daemon.terminalProfiles,
    agentProfiles: daemon.agentProfiles,
    cors: { allowedOrigins: [] },
    trustedProxies: ["loopback"],
    git: {
      maxProcessesPerSecond: git.maxProcessesPerSecond ?? 64,
      maxProcessConcurrency: git.maxProcessConcurrency ?? 8,
    },
    app: { baseUrl: "https://app.q8idevai.sh" },
    pluginsEnabled: persisted.pluginsEnabled ?? false,
    plugins: persisted.plugins ?? {},
  };
}

describe("applyMutableProviderConfigToOverrides", () => {
  test("merges mutable provider fields onto provider overrides", () => {
    expect(
      applyMutableProviderConfigToOverrides(
        {
          gemini: {
            extends: "acp",
            label: "Gemini",
            command: ["gemini", "--acp"],
          },
        },
        {
          gemini: {
            enabled: false,
            description: "Gemini ACP",
            env: { GEMINI_AUTO_UPDATE: "0" },
          },
          claude: {
            additionalModels: [
              {
                id: "claude-custom",
                label: "claude-custom",
              },
            ],
          },
        },
      ),
    ).toEqual({
      gemini: {
        extends: "acp",
        label: "Gemini",
        description: "Gemini ACP",
        command: ["gemini", "--acp"],
        env: { GEMINI_AUTO_UPDATE: "0" },
        enabled: false,
      },
      claude: {
        additionalModels: [
          {
            id: "claude-custom",
            label: "claude-custom",
          },
        ],
      },
    });
  });
});

describe("DaemonConfigStore", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("patch persists relay state and emits its field change", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(q8idevaiHome, {
      relay: { enabled: false },
      mcp: { injectIntoAgents: false },
      browserTools: { enabled: false },
      providers: {},
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
    });
    const changes: unknown[] = [];
    store.onFieldChange("relay.enabled", (value) => changes.push(value));

    store.patch({ relay: { enabled: true } });

    expect(changes).toEqual([true]);
    expect(loadPersistedConfig(q8idevaiHome).daemon?.relay?.enabled).toBe(true);
  });

  test("patch round-trips agent profiles through the strictly-parsed persisted config", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(q8idevaiHome, {
      relay: { enabled: false },
      mcp: { injectIntoAgents: false },
      browserTools: { enabled: false },
      providers: {},
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
    });

    store.patch({
      agentProfiles: [
        {
          id: "profile_ui",
          name: "UI work",
          icon: "🎨",
          provider: "claude",
          model: "claude-opus-5",
          modeId: "plan",
          thinkingOptionId: "think-hard",
          featureValues: { webSearch: true },
          notes: "Use for components, layout and design tokens.",
        },
      ],
    });

    expect(loadPersistedConfig(q8idevaiHome).daemon?.agentProfiles).toEqual([
      {
        id: "profile_ui",
        name: "UI work",
        icon: "🎨",
        provider: "claude",
        model: "claude-opus-5",
        modeId: "plan",
        thinkingOptionId: "think-hard",
        featureValues: { webSearch: true },
        notes: "Use for components, layout and design tokens.",
      },
    ]);
    expect(store.get().agentProfiles).toHaveLength(1);
  });

  test("patch replaces the whole agent profile list rather than merging entries", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(q8idevaiHome, {
      relay: { enabled: false },
      mcp: { injectIntoAgents: false },
      browserTools: { enabled: false },
      providers: {},
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
      agentProfiles: [
        { id: "a", name: "Keep", provider: "claude" },
        { id: "b", name: "Drop", provider: "codex" },
      ],
    });

    store.patch({ agentProfiles: [{ id: "a", name: "Keep", provider: "claude" }] });

    expect(store.get().agentProfiles).toEqual([{ id: "a", name: "Keep", provider: "claude" }]);
    expect(loadPersistedConfig(q8idevaiHome).daemon?.agentProfiles).toHaveLength(1);
  });

  test("rolls back config when a field transition fails", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(q8idevaiHome, {
      relay: { enabled: false },
      mcp: { injectIntoAgents: false },
      browserTools: { enabled: false },
      providers: {},
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
    });
    store.onFieldChange("relay.enabled", (enabled) => {
      if (enabled === true) {
        throw new Error("Relay transport failed to start");
      }
    });

    expect(() => store.patch({ relay: { enabled: true } })).toThrow(
      "Relay transport failed to start",
    );
    expect(store.get().relay?.enabled).toBe(false);
    expect(loadPersistedConfig(q8idevaiHome).daemon?.relay?.enabled).toBe(false);
  });

  test("rolls back live owners when a later transactional owner fails", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(q8idevaiHome, {
      relay: { enabled: false },
      mcp: { injectIntoAgents: false },
      browserTools: { enabled: false },
      providers: {},
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
    });
    let browserToolsEnabled = false;
    store.onApply((next, previous) => {
      browserToolsEnabled = next.browserTools.enabled;
      return () => {
        browserToolsEnabled = previous.browserTools.enabled;
      };
    });
    store.onApply(() => {
      throw new Error("Provider refresh failed");
    });

    expect(() => store.patch({ browserTools: { enabled: true } })).toThrow(
      "Provider refresh failed",
    );
    expect(browserToolsEnabled).toBe(false);
    expect(store.get().browserTools.enabled).toBe(false);
    expect(loadPersistedConfig(q8idevaiHome).daemon?.browserTools?.enabled).toBeUndefined();
  });

  test("rejects relay patches when a launch override owns the setting", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        relay: { enabled: false },
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
      { relayEnabledMutable: false },
    );

    expect(() => store.patch({ relay: { enabled: true } })).toThrow(
      "Relay is controlled by a daemon launch override",
    );
  });

  test("unrelated patches do not persist a one-launch relay override", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const persisted = loadPersistedConfig(q8idevaiHome);
    writeFileSync(
      path.join(q8idevaiHome, "config.json"),
      `${JSON.stringify({
        ...persisted,
        daemon: { ...persisted.daemon, relay: { enabled: false } },
      })}\n`,
    );
    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        relay: { enabled: true },
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
      { relayEnabledMutable: false },
    );

    store.patch({ browserTools: { enabled: true } });

    expect(loadPersistedConfig(q8idevaiHome).daemon?.relay?.enabled).toBe(false);
  });

  test("unrelated patches persist only requested file intent", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    const before = loadPersistedConfig(q8idevaiHome);
    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        relay: { enabled: true },
        mcp: { enabled: false, injectIntoAgents: false },
        hostnames: ["launch.example.test"],
        cors: { allowedOrigins: ["https://launch.example.test"] },
        trustedProxies: true,
        git: { maxProcessesPerSecond: 7, maxProcessConcurrency: 2 },
        app: { baseUrl: "https://launch.example.test" },
        catalogRefreshTimeoutMs: 9_000,
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
      { relayEnabledMutable: false },
    );

    store.patch({
      appendSystemPrompt: "Only this field",
      // Reload-only runtime state is accepted as unknown wire data for forward
      // compatibility but is not part of the patch capability.
      hostnames: ["attempted-patch.example.test"],
    } as Parameters<typeof store.patch>[0]);

    expect(store.get().hostnames).toEqual(["launch.example.test"]);
    expect(loadPersistedConfig(q8idevaiHome)).toEqual({
      ...before,
      daemon: { ...before.daemon, appendSystemPrompt: "Only this field" },
    });
  });

  test("patch persists provider enabled flags into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const initial = loadPersistedConfig(q8idevaiHome);
    const configPath = path.join(q8idevaiHome, "config.json");
    // Reuse the validated serializer through the store path by seeding the file directly.
    // This keeps the test focused on the merge behavior.
    const seeded =
      JSON.stringify(
        {
          ...initial,
          agents: {
            providers: {
              gemini: {
                extends: "acp",
                label: "Gemini",
                command: ["gemini", "--acp"],
              },
            },
          },
        },
        null,
        2,
      ) + "\n";
    writeFileSync(configPath, seeded);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({
      providers: {
        gemini: { enabled: false },
      },
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers?.gemini).toEqual({
      extends: "acp",
      label: "Gemini",
      command: ["gemini", "--acp"],
      enabled: false,
    });
  });

  test("patch persists provider Q8iDevAI-tool policy without changing availability", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);
    writeFileSync(
      path.join(q8idevaiHome, "config.json"),
      JSON.stringify({ agents: { providers: { claude: { enabled: false } } } }),
    );
    const store = new DaemonConfigStore(q8idevaiHome, {
      mcp: { injectIntoAgents: true },
      browserTools: { enabled: false },
      providers: { claude: { enabled: false } },
      metadataGeneration: { providers: [] },
      autoArchiveAfterMerge: false,
      enableTerminalAgentHooks: false,
      appendSystemPrompt: "",
    });

    store.patch({
      providers: {
        claude: {
          q8idevaiTools: { enabled: true, disabledTools: ["list_agents"] },
        },
      },
    });
    store.patch({
      providers: {
        claude: {
          q8idevaiTools: { disabledTools: ["create_agent"] },
        },
      },
    });

    expect(store.get().providers.claude).toEqual({
      enabled: false,
      q8idevaiTools: { enabled: true, disabledTools: ["create_agent"] },
    });
    expect(loadPersistedConfig(q8idevaiHome).agents?.providers?.claude).toEqual({
      enabled: false,
      q8idevaiTools: { enabled: true, disabledTools: ["create_agent"] },
    });
  });

  test("patch removes provider entries from config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const configPath = path.join(q8idevaiHome, "config.json");
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          version: 1,
          agents: {
            providers: {
              gemini: {
                extends: "acp",
                label: "Gemini",
                command: ["gemini", "--acp"],
              },
              claude: {
                enabled: false,
              },
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {
          gemini: {},
          claude: { enabled: false },
        },
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    const next = store.patch({ removeProviders: ["gemini"] });

    expect(next.providers.gemini).toBeUndefined();
    expect(next.providers.claude).toEqual({ enabled: false });
    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers?.gemini).toBeUndefined();
    expect(persisted.agents?.providers?.claude).toEqual({ enabled: false });
  });

  test("patch removes the providers object when the last provider is deleted", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const configPath = path.join(q8idevaiHome, "config.json");
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          version: 1,
          agents: {
            providers: {
              gemini: {
                extends: "acp",
                label: "Gemini",
                command: ["gemini", "--acp"],
              },
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: { gemini: {} },
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({ removeProviders: ["gemini"] });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers).toBeUndefined();
  });

  test("patch removes deleted providers from metadata generation", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const configPath = path.join(q8idevaiHome, "config.json");
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          version: 1,
          agents: {
            providers: {
              gemini: {
                extends: "acp",
                label: "Gemini",
                command: ["gemini", "--acp"],
              },
              claude: {
                enabled: false,
              },
            },
            metadataGeneration: {
              providers: [
                { provider: "gemini", model: "flash" },
                { provider: "claude", model: "haiku" },
              ],
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {
          gemini: {},
          claude: { enabled: false },
        },
        metadataGeneration: {
          providers: [
            { provider: "gemini", model: "flash" },
            { provider: "claude", model: "haiku" },
          ],
        },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    const next = store.patch({ removeProviders: ["gemini"] });

    expect(next.metadataGeneration.providers).toEqual([{ provider: "claude", model: "haiku" }]);
    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.metadataGeneration).toEqual({
      providers: [{ provider: "claude", model: "haiku" }],
    });
  });

  test("patch persists provider removal when in-memory config is already clean", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const configPath = path.join(q8idevaiHome, "config.json");
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          version: 1,
          agents: {
            providers: {
              gemini: {
                extends: "acp",
                label: "Gemini",
                command: ["gemini", "--acp"],
              },
            },
            metadataGeneration: {
              providers: [{ provider: "gemini", model: "flash" }],
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    const next = store.patch({ removeProviders: ["gemini"] });

    expect(next.providers.gemini).toBeUndefined();
    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers).toBeUndefined();
    expect(persisted.agents?.metadataGeneration).toEqual({ providers: [] });
  });

  test("patch persists append system prompt into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({
      appendSystemPrompt: "Prefer terse replies.",
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.daemon?.appendSystemPrompt).toBe("Prefer terse replies.");
  });

  test("patch persists browser tools opt-in into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({ browserTools: { enabled: true } });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.daemon?.browserTools).toEqual({ enabled: true });
  });

  test("patch persists provider additional models into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({
      providers: {
        claude: {
          additionalModels: [
            {
              id: "claude-custom",
              label: "claude-custom",
            },
          ],
        },
      },
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers?.claude).toEqual({
      additionalModels: [
        {
          id: "claude-custom",
          label: "claude-custom",
        },
      ],
    });
  });

  test("patch persists daemon append system prompt into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({
      appendSystemPrompt: "Prefer terse replies.",
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.daemon?.appendSystemPrompt).toBe("Prefer terse replies.");
  });

  test("patch persists enable terminal agent hooks into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({ enableTerminalAgentHooks: true });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.daemon?.enableTerminalAgentHooks).toBe(true);
  });

  test("patch persists metadata generation providers into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        metadataGeneration: { providers: [] },
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
      },
      undefined,
    );

    store.patch({
      metadataGeneration: {
        providers: [
          { provider: "claude", model: "haiku" },
          { provider: "codex", model: "gpt-5.4-mini", thinkingOptionId: "low" },
        ],
      },
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.metadataGeneration).toEqual({
      providers: [
        { provider: "claude", model: "haiku" },
        { provider: "codex", model: "gpt-5.4-mini", thinkingOptionId: "low" },
      ],
    });
  });

  test("patch persists clearing metadata generation providers into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const configPath = path.join(q8idevaiHome, "config.json");
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          version: 1,
          agents: {
            metadataGeneration: {
              providers: [{ provider: "claude", model: "haiku" }],
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
        metadataGeneration: { providers: [{ provider: "claude", model: "haiku" }] },
      },
      undefined,
    );

    store.patch({ metadataGeneration: { providers: [] } });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.metadataGeneration).toEqual({ providers: [] });
  });

  test("patch persists custom ACP provider overrides into config.json", () => {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-store-"));
    tempDirs.push(q8idevaiHome);

    const store = new DaemonConfigStore(
      q8idevaiHome,
      {
        mcp: { injectIntoAgents: false },
        browserTools: { enabled: false },
        providers: {},
        autoArchiveAfterMerge: false,
        enableTerminalAgentHooks: false,
        appendSystemPrompt: "",
        metadataGeneration: { providers: [] },
      },
      undefined,
    );

    store.patch({
      providers: {
        "q8idevai-e2e-acp": {
          extends: "acp",
          label: "Q8iDevAI E2E ACP",
          description: "E2E ACP provider fixture",
          command: ["npx", "-y", "--version"],
          env: {},
        },
      },
    });

    const persisted = loadPersistedConfig(q8idevaiHome);
    expect(persisted.agents?.providers?.["q8idevai-e2e-acp"]).toEqual({
      extends: "acp",
      label: "Q8iDevAI E2E ACP",
      description: "E2E ACP provider fixture",
      command: ["npx", "-y", "--version"],
      env: {},
    });
  });
});

describe("DaemonConfigStore reload", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  function createReloadableStore(
    options: {
      overrideControlledPaths?: string[];
      initialPersisted?: PersistedConfig;
    } = {},
  ) {
    const q8idevaiHome = mkdtempSync(path.join(tmpdir(), "q8idevai-daemon-config-reload-"));
    tempDirs.push(q8idevaiHome);
    if (options.initialPersisted) {
      writeFileSync(
        path.join(q8idevaiHome, "config.json"),
        `${JSON.stringify(options.initialPersisted, null, 2)}\n`,
      );
    }
    const persisted = loadPersistedConfig(q8idevaiHome);
    const relayEnabledFallback = persisted.daemon?.relay?.enabled === undefined;
    const initialMutable = reloadableConfig(persisted, { relayEnabledFallback });
    const store = new DaemonConfigStore(q8idevaiHome, initialMutable, undefined, {
      reloadSource: {
        resolve: (nextPersisted) => {
          const mutable = reloadableConfig(nextPersisted, { relayEnabledFallback });
          if (options.overrideControlledPaths?.includes("daemon.relay.enabled")) {
            mutable.relay = initialMutable.relay;
          }
          return {
            mutable,
            overrideControlledPaths: options.overrideControlledPaths ?? [],
          };
        },
      },
    });
    return { q8idevaiHome, store, persisted };
  }

  function writeConfig(q8idevaiHome: string, config: unknown): void {
    writeFileSync(path.join(q8idevaiHome, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
  }

  test("applies mutable edits and reports startup-only edits", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore();
    writeConfig(q8idevaiHome, {
      ...persisted,
      daemon: {
        ...persisted.daemon,
        listen: "127.0.0.1:7777",
        browserTools: { enabled: true },
        git: { maxProcessesPerSecond: 12, maxProcessConcurrency: 3 },
      },
    });

    expect(store.reload()).toEqual({
      appliedPaths: [
        "daemon.browserTools.enabled",
        "daemon.git.maxProcessConcurrency",
        "daemon.git.maxProcessesPerSecond",
      ],
      restartRequiredPaths: ["daemon.listen"],
      overrideControlledPaths: [],
    });
    expect(store.get().browserTools.enabled).toBe(true);
    expect(store.get().git).toEqual({ maxProcessesPerSecond: 12, maxProcessConcurrency: 3 });
  });

  test("applies the global plugin switch in both directions", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore({
      initialPersisted: { version: 1, pluginsEnabled: false },
    });
    const changes: unknown[] = [];
    store.onFieldChange("pluginsEnabled", (value) => changes.push(value));

    writeConfig(q8idevaiHome, { ...persisted, pluginsEnabled: true });
    expect(store.reload()).toEqual({
      appliedPaths: ["pluginsEnabled"],
      restartRequiredPaths: [],
      overrideControlledPaths: [],
    });
    expect(store.get().pluginsEnabled).toBe(true);

    writeConfig(q8idevaiHome, { ...persisted, pluginsEnabled: false });
    expect(store.reload()).toEqual({
      appliedPaths: ["pluginsEnabled"],
      restartRequiredPaths: [],
      overrideControlledPaths: [],
    });
    expect(store.get().pluginsEnabled).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  test("classifies every leaf when a parent subtree is added", () => {
    const { q8idevaiHome, store } = createReloadableStore({
      initialPersisted: { version: 1 },
    });
    writeConfig(q8idevaiHome, {
      version: 1,
      daemon: {
        relay: {
          enabled: false,
          endpoint: "relay.example.test:443",
          useTls: true,
        },
      },
    });

    expect(store.reload()).toEqual({
      appliedPaths: ["daemon.relay.enabled"],
      restartRequiredPaths: ["daemon.relay.endpoint", "daemon.relay.useTls"],
      overrideControlledPaths: [],
    });
  });

  test("classifies every leaf when the daemon subtree is removed", () => {
    const { q8idevaiHome, store } = createReloadableStore({
      initialPersisted: {
        version: 1,
        daemon: {
          listen: "127.0.0.1:7777",
          browserTools: { enabled: true },
          relay: {
            enabled: false,
            endpoint: "relay.example.test:443",
            useTls: true,
          },
          serviceProxy: {
            listen: "127.0.0.1:7788",
            publicBaseUrl: "https://services.example.test",
          },
        },
      },
    });
    writeConfig(q8idevaiHome, { version: 1 });

    expect(store.reload()).toEqual({
      appliedPaths: ["daemon.browserTools.enabled"],
      restartRequiredPaths: [
        "daemon.listen",
        "daemon.relay.endpoint",
        "daemon.relay.useTls",
        "daemon.serviceProxy.listen",
        "daemon.serviceProxy.publicBaseUrl",
      ],
      overrideControlledPaths: [],
    });
    expect(store.get().relay?.enabled).toBe(false);
  });

  test("keeps overridden leaves separate from restart-required siblings", () => {
    const { q8idevaiHome, store } = createReloadableStore({
      initialPersisted: { version: 1 },
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
    writeConfig(q8idevaiHome, {
      version: 1,
      daemon: {
        relay: { enabled: false, endpoint: "relay.example.test:443" },
      },
    });

    expect(store.reload()).toEqual({
      appliedPaths: [],
      restartRequiredPaths: ["daemon.relay.endpoint"],
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
  });

  test("invalid JSON and invalid schema apply nothing", () => {
    const { q8idevaiHome, store } = createReloadableStore();
    writeFileSync(path.join(q8idevaiHome, "config.json"), "{ nope\n");
    expect(() => store.reload()).toThrow("Invalid JSON");
    expect(store.get().browserTools.enabled).toBe(false);

    writeConfig(q8idevaiHome, { daemon: { browserTools: { enabled: "yes" } } });
    expect(() => store.reload()).toThrow("Invalid config");
    expect(store.get().browserTools.enabled).toBe(false);
  });

  test("removing providers and optional profiles clears live state", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore();
    writeConfig(q8idevaiHome, {
      ...persisted,
      daemon: {
        ...persisted.daemon,
        terminalProfiles: [{ id: "shell", name: "Shell", command: "bash" }],
        agentProfiles: [{ id: "review", name: "Review", provider: "codex" }],
      },
      agents: {
        providers: {
          gemini: { extends: "acp", label: "Gemini", command: ["gemini", "--acp"] },
        },
      },
    });
    store.reload();

    writeConfig(q8idevaiHome, persisted);
    const result = store.reload();

    expect(result.appliedPaths).toEqual([
      "agents.providers",
      "daemon.agentProfiles",
      "daemon.terminalProfiles",
    ]);
    expect(store.get().providers).toEqual({});
    expect(store.get().terminalProfiles).toBeUndefined();
    expect(store.get().agentProfiles).toBeUndefined();
  });

  test("reports a launch-controlled edit without changing live state", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore({
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
    const initialRelay = store.get().relay?.enabled;
    writeConfig(q8idevaiHome, {
      ...persisted,
      daemon: { ...persisted.daemon, relay: { enabled: !initialRelay } },
    });

    expect(store.reload()).toEqual({
      appliedPaths: [],
      restartRequiredPaths: [],
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
    expect(store.get().relay?.enabled).toBe(initialRelay);
  });

  test("an unrelated patch does not mark a manual override-owned edit as applied", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore({
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
    writeConfig(q8idevaiHome, {
      ...persisted,
      daemon: { ...persisted.daemon, relay: { enabled: true } },
    });
    store.patch({ appendSystemPrompt: "patched elsewhere" });

    expect(store.reload()).toEqual({
      appliedPaths: [],
      restartRequiredPaths: [],
      overrideControlledPaths: ["daemon.relay.enabled"],
    });
  });

  test("reports startup-only launch overrides instead of restart warnings", () => {
    const { q8idevaiHome, store, persisted } = createReloadableStore({
      overrideControlledPaths: ["daemon.listen", "daemon.relay.endpoint"],
    });
    writeConfig(q8idevaiHome, {
      ...persisted,
      daemon: {
        ...persisted.daemon,
        listen: "127.0.0.1:7777",
        relay: {
          ...persisted.daemon?.relay,
          endpoint: "relay.example.test:443",
        },
      },
    });

    expect(store.reload()).toEqual({
      appliedPaths: [],
      restartRequiredPaths: [],
      overrideControlledPaths: ["daemon.listen", "daemon.relay.endpoint"],
    });
  });

  test("a no-op reload returns empty path lists", () => {
    const { store } = createReloadableStore();
    expect(store.reload()).toEqual({
      appliedPaths: [],
      restartRequiredPaths: [],
      overrideControlledPaths: [],
    });
  });
});
