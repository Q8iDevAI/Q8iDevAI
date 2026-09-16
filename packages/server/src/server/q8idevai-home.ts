import os from "node:os";
import path from "node:path";

function expandHomeDir(input: string): string {
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  if (input === "~") {
    return os.homedir();
  }
  return input;
}

export function resolveQ8iDevAIHome(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.Q8IDEVAI_HOME ?? "~/.q8idevai";
  const resolved = path.resolve(expandHomeDir(raw));
  return resolved;
}
