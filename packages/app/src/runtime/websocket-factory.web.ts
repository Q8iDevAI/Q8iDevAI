import { defaultWebSocketFactory } from "@q8idevai/client/internal/daemon-client-websocket-transport";
import type { WebSocketFactory } from "@q8idevai/client/internal/daemon-client-transport-types";

export function createAppWebSocketFactory(): WebSocketFactory {
  return defaultWebSocketFactory;
}
