import { useCallback, type ReactNode } from "react";
import { PluginClientStateProvider, usePluginClientStateSource } from "./client-state.js";
import { Q8iDevAIApiProvider, useQ8iDevAIContextValue } from "./q8idevai-context.js";
import { PluginRpcProvider, usePluginRpcContextValue } from "./rpc-context.js";

export type PluginRuntimeContextBridge = (children: ReactNode) => ReactNode;

/** Rebuilds plugin runtime contexts inside React Native portal hosts. */
export function usePluginRuntimeContextBridge(): PluginRuntimeContextBridge {
  const q8idevai = useQ8iDevAIContextValue();
  const rpc = usePluginRpcContextValue();
  const state = usePluginClientStateSource();

  if (!q8idevai || !rpc) {
    throw new Error("Plugin UI must run inside a contributed plugin surface");
  }

  return useCallback(
    (children: ReactNode) => {
      const content = state ? (
        <PluginClientStateProvider source={state}>{children}</PluginClientStateProvider>
      ) : (
        children
      );
      return (
        <Q8iDevAIApiProvider q8idevai={q8idevai}>
          <PluginRpcProvider invoke={rpc.invoke}>{content}</PluginRpcProvider>
        </Q8iDevAIApiProvider>
      );
    },
    [q8idevai, rpc, state],
  );
}
