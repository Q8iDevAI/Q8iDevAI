import { resolve } from "path";

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isQ8iDevAIDictationDebugEnabled(): boolean {
  return isTruthyEnv(process.env.Q8IDEVAI_DICTATION_DEBUG);
}

export function resolveRecordingsDebugDir(explicitEnvVarName: string): string | null {
  const explicit = process.env[explicitEnvVarName];
  if (explicit && explicit.trim()) {
    return resolve(explicit.trim());
  }

  if (!isQ8iDevAIDictationDebugEnabled()) {
    return null;
  }

  return resolve(process.cwd(), ".debug/recordings");
}
