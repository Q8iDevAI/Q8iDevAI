import { QueryClientProvider } from "@tanstack/react-query";
import { Q8iDevAIApiProvider, PluginRpcProvider } from "@q8idevai/plugin/client/host";
import type { ReactNode } from "react";
import type { InstalledPlugin } from "./types";
import { usePluginSurfaceRuntime } from "./surface-runtime";
import type { DaemonClient } from "@q8idevai/client/internal/daemon-client";

export function PluginRuntimeBoundary({
  plugin,
  client,
  children,
}: {
  plugin: InstalledPlugin;
  client: DaemonClient;
  children: ReactNode;
}) {
  const runtime = usePluginSurfaceRuntime(client, plugin);
  if (!runtime) return null;
  return (
    <QueryClientProvider client={plugin.queryClient}>
      <Q8iDevAIApiProvider q8idevai={runtime.q8idevai}>
        <PluginRpcProvider invoke={runtime.invoke}>{children}</PluginRpcProvider>
      </Q8iDevAIApiProvider>
    </QueryClientProvider>
  );
}
