import path from "node:path";

import { resolveQ8iDevAIHome } from "../../../q8idevai-home.js";

const OPENCODE_HOME_DIRNAME = "opencode-home";

export function resolveOpenCodeHomeDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveQ8iDevAIHome(env), OPENCODE_HOME_DIRNAME);
}
