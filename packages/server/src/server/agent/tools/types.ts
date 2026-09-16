import type { z } from "zod";
import type { ProviderQ8iDevAIToolsPolicy } from "@q8idevai/protocol/provider-config";

export interface Q8iDevAIToolExecutionContext {
  signal?: AbortSignal;
  sendUpdate?: (update: Q8iDevAIToolResult) => void;
}

export interface Q8iDevAIToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export interface Q8iDevAIToolConfig {
  title?: string;
  description?: string;
  inputSchema?: z.ZodRawShape | z.ZodType;
  outputSchema?: z.ZodRawShape;
}

export interface Q8iDevAIToolDefinition extends Q8iDevAIToolConfig {
  name: string;
  description: string;
  handler: (input: unknown, context: Q8iDevAIToolExecutionContext) => Promise<Q8iDevAIToolResult>;
}

export interface Q8iDevAIToolCatalog {
  tools: ReadonlyMap<string, Q8iDevAIToolDefinition>;
  getTool(name: string): Q8iDevAIToolDefinition | undefined;
  executeTool(
    name: string,
    input: unknown,
    context?: Q8iDevAIToolExecutionContext,
  ): Promise<Q8iDevAIToolResult>;
}

export interface Q8iDevAIToolRuntimeContext {
  callerAgentId?: string;
  q8idevaiToolPolicy?: ProviderQ8iDevAIToolsPolicy;
  enableVoiceTools?: boolean;
  voiceOnly?: boolean;
}

export type Q8iDevAIToolCatalogFactory = (
  context: Q8iDevAIToolRuntimeContext,
) => Q8iDevAIToolCatalog | Promise<Q8iDevAIToolCatalog>;
