import type { PluginServerContext } from "@q8idevai/plugin/server";
import { preferences } from "./shared/preferences";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(preferences);
  return () => {};
}
