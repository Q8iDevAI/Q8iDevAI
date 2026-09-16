import { describe, expect, test } from "vitest";

import { MutableDaemonConfigPatchSchema, MutableDaemonConfigSchema } from "./messages.js";
import { ProviderOverrideSchema, ProviderQ8iDevAIToolsPolicySchema } from "./provider-config.js";

describe("provider Q8iDevAI-tool policy", () => {
  test("accepts arbitrary tool IDs and leaves an empty policy enabled by default", () => {
    expect(
      ProviderQ8iDevAIToolsPolicySchema.parse({
        disabledTools: ["future_tool", "browser_future_tool"],
      }),
    ).toEqual({
      disabledTools: ["future_tool", "browser_future_tool"],
    });
    expect(ProviderQ8iDevAIToolsPolicySchema.parse({})).toEqual({});
    expect(ProviderOverrideSchema.parse({}).q8idevaiTools).toBeUndefined();
  });

  test("accepts q8idevaiTools on persisted provider overrides", () => {
    expect(
      ProviderOverrideSchema.parse({
        extends: "claude",
        q8idevaiTools: {
          enabled: false,
          disabledTools: ["create_workspace"],
        },
      }).q8idevaiTools,
    ).toEqual({
      enabled: false,
      disabledTools: ["create_workspace"],
    });
  });

  test("accepts q8idevaiTools when reading and patching mutable daemon providers", () => {
    expect(
      MutableDaemonConfigSchema.parse({
        mcp: { injectIntoAgents: true },
        providers: {
          codex: {
            q8idevaiTools: { enabled: false, disabledTools: ["future_tool"] },
          },
        },
      }).providers.codex?.q8idevaiTools,
    ).toEqual({
      enabled: false,
      disabledTools: ["future_tool"],
    });

    expect(
      MutableDaemonConfigPatchSchema.parse({
        providers: {
          codex: {
            q8idevaiTools: { disabledTools: ["browser_future_tool"] },
          },
        },
      }).providers?.codex?.q8idevaiTools,
    ).toEqual({ disabledTools: ["browser_future_tool"] });
  });
});
