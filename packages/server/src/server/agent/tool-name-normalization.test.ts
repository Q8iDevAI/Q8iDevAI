import { describe, expect, it } from "vitest";

import { getQ8iDevAIToolLeafName, isQ8iDevAIToolName } from "@q8idevai/protocol/tool-name-normalization";

describe("isQ8iDevAIToolName", () => {
  it("detects Claude Code format", () => {
    expect(isQ8iDevAIToolName("mcp__q8idevai__create_agent")).toBe(true);
    expect(isQ8iDevAIToolName("mcp__q8idevai__list_agents")).toBe(true);
  });

  it("detects q8idevai_voice variant", () => {
    expect(isQ8iDevAIToolName("mcp__q8idevai_voice__create_agent")).toBe(true);
    expect(isQ8iDevAIToolName("q8idevai_voice.create_agent")).toBe(true);
  });

  it("excludes speak tools", () => {
    expect(isQ8iDevAIToolName("mcp__q8idevai_voice__speak")).toBe(false);
    expect(isQ8iDevAIToolName("mcp__q8idevai__speak")).toBe(false);
    expect(isQ8iDevAIToolName("q8idevai.speak")).toBe(false);
  });

  it("detects Codex dot format", () => {
    expect(isQ8iDevAIToolName("q8idevai.create_agent")).toBe(true);
  });

  it("rejects non-q8idevai tools", () => {
    expect(isQ8iDevAIToolName("Bash")).toBe(false);
    expect(isQ8iDevAIToolName("Read")).toBe(false);
    expect(isQ8iDevAIToolName("mcp__other_server__some_tool")).toBe(false);
  });
});

describe("getQ8iDevAIToolLeafName", () => {
  it("extracts leaf from Claude Code format", () => {
    expect(getQ8iDevAIToolLeafName("mcp__q8idevai__create_agent")).toBe("create_agent");
  });

  it("extracts leaf from Codex format", () => {
    expect(getQ8iDevAIToolLeafName("q8idevai.create_agent")).toBe("create_agent");
    expect(getQ8iDevAIToolLeafName("q8idevai.list_agents")).toBe("list_agents");
  });

  it("returns null for non-q8idevai tools", () => {
    expect(getQ8iDevAIToolLeafName("Bash")).toBeNull();
  });
});
