import { describe, expect, test } from "vitest";
import type { ProviderQ8iDevAIToolsPolicy } from "@q8idevai/protocol/provider-config";

import { isQ8iDevAIToolEnabled, resolveQ8iDevAIToolPolicy } from "./q8idevai-tool-policy.js";

describe("Q8iDevAI tool policy", () => {
  test("defaults to all Q8iDevAI tools and resolves only the exact provider ID", () => {
    const customPolicy = {
      enabled: true,
      disabledTools: ["list_agents"],
    } satisfies ProviderQ8iDevAIToolsPolicy;

    expect(
      resolveQ8iDevAIToolPolicy("custom-claude", {
        claude: { q8idevaiTools: { enabled: false } },
        "custom-claude": { q8idevaiTools: customPolicy },
      }),
    ).toBe(customPolicy);
    expect(resolveQ8iDevAIToolPolicy("other-custom", { claude: { q8idevaiTools: customPolicy } })).toBe(
      undefined,
    );
    expect(isQ8iDevAIToolEnabled(undefined, "list_agents")).toBe(true);
  });

  test("applies the provider gate and sparse disabled tools without filtering speak", () => {
    expect(isQ8iDevAIToolEnabled({ enabled: false }, "list_agents")).toBe(false);
    expect(isQ8iDevAIToolEnabled({ enabled: false }, "speak")).toBe(true);
    expect(
      isQ8iDevAIToolEnabled({ enabled: true, disabledTools: ["list_agents"] }, "list_agents"),
    ).toBe(false);
    expect(
      isQ8iDevAIToolEnabled({ enabled: true, disabledTools: ["list_agents"] }, "create_agent"),
    ).toBe(true);
  });
});
