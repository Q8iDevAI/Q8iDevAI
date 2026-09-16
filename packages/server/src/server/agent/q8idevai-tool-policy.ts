import type { ProviderQ8iDevAIToolsPolicy } from "@q8idevai/protocol/provider-config";

interface ProviderQ8iDevAIToolSettings {
  q8idevaiTools?: ProviderQ8iDevAIToolsPolicy;
}

export function resolveQ8iDevAIToolPolicy(
  providerId: string,
  providerSettings: Readonly<Record<string, ProviderQ8iDevAIToolSettings>> | undefined,
): ProviderQ8iDevAIToolsPolicy | undefined {
  return providerSettings?.[providerId]?.q8idevaiTools;
}

export function isQ8iDevAIToolEnabled(
  policy: ProviderQ8iDevAIToolsPolicy | undefined,
  toolName: string,
): boolean {
  if (toolName === "speak") {
    return true;
  }
  if (!isQ8iDevAIToolPolicyEnabled(policy)) {
    return false;
  }
  return !policy?.disabledTools?.includes(toolName);
}

export function isQ8iDevAIToolPolicyEnabled(policy: ProviderQ8iDevAIToolsPolicy | undefined): boolean {
  return policy?.enabled !== false;
}
