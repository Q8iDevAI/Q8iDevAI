import { describe, expect, test } from "vitest";

import type { AgentSessionConfig } from "./agent-sdk-types.js";
import { withRuntimeQ8iDevAIMcpServer } from "./runtime-mcp-config.js";

const BASE_CONFIG: AgentSessionConfig = {
  provider: "claude",
  cwd: "/tmp/agent",
};

describe("withRuntimeQ8iDevAIMcpServer", () => {
  test("injects the q8idevai MCP server with a bearer header when a token is provided", () => {
    const result = withRuntimeQ8iDevAIMcpServer({
      config: BASE_CONFIG,
      agentId: "agent-1",
      mcpBaseUrl: "http://127.0.0.1:6767/mcp/agents",
      mcpAuthToken: "cap-token",
    });

    expect(result.mcpServers?.q8idevai).toEqual({
      type: "http",
      url: "http://127.0.0.1:6767/mcp/agents?callerAgentId=agent-1",
      headers: { Authorization: "Bearer cap-token" },
    });
  });

  test("omits the header when no token is available", () => {
    const result = withRuntimeQ8iDevAIMcpServer({
      config: BASE_CONFIG,
      agentId: "agent-1",
      mcpBaseUrl: "http://127.0.0.1:6767/mcp/agents",
      mcpAuthToken: null,
    });

    expect(result.mcpServers?.q8idevai).toEqual({
      type: "http",
      url: "http://127.0.0.1:6767/mcp/agents?callerAgentId=agent-1",
    });
  });

  test("does not inject when no MCP base URL is configured", () => {
    const result = withRuntimeQ8iDevAIMcpServer({
      config: BASE_CONFIG,
      agentId: "agent-1",
      mcpBaseUrl: null,
      mcpAuthToken: "cap-token",
    });

    expect(result.mcpServers).toBeUndefined();
  });
});
