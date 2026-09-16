#!/usr/bin/env npx tsx

import assert from "node:assert";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "zx";
import { runLocalQ8iDevAI } from "./helpers/local-cli.ts";
import { getAvailablePort } from "./helpers/network.ts";

$.verbose = false;

console.log("=== Onboarding Command ===\n");

const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-onboard-home-"));
const port = await getAvailablePort();

try {
  const configured = await runLocalQ8iDevAI([
    "daemon",
    "config",
    "set",
    "daemon.listen",
    `127.0.0.1:${port}`,
    "--home",
    q8idevaiHome,
  ]);
  assert.strictEqual(configured.exitCode, 0, configured.stderr);

  console.log("Test 1: `q8idevai` runs blocking onboarding without implicit relay pairing");
  const onboard = await $`Q8IDEVAI_HOME=${q8idevaiHome} Q8IDEVAI_PAIRING_QR=0 npx q8idevai`.nothrow();

  assert.strictEqual(
    onboard.exitCode,
    0,
    `onboard should succeed:\nstdout:\n${onboard.stdout}\nstderr:\n${onboard.stderr}`,
  );
  assert(!onboard.stdout.includes("Scan to pair"), "onboard output should not include scan header");
  assert(!onboard.stdout.includes("#offer="), "onboard output should not include a pairing offer");
  assert(
    onboard.stdout.includes("Daemon is running with relay off"),
    "onboard output should explain the direct connection path",
  );
  assert(
    onboard.stdout.includes("CLI quick reference"),
    "onboard output should include CLI quick reference",
  );
  assert(onboard.stdout.includes("q8idevai --help"), "onboard output should include --help shortcut");
  assert(onboard.stdout.includes("q8idevai ls"), "onboard output should include ls shortcut");
  assert(
    onboard.stdout.includes(`q8idevai run --home ${JSON.stringify(q8idevaiHome)} "your prompt"`),
    "onboard output should include a run shortcut for the selected home",
  );
  assert(onboard.stdout.includes("q8idevai status"), "onboard output should include status shortcut");
  assert(
    onboard.stdout.includes(join(q8idevaiHome, "daemon.log")),
    "onboard output should include daemon log path",
  );

  const status =
    await $`Q8IDEVAI_HOME=${q8idevaiHome} npx q8idevai daemon status --home ${q8idevaiHome}`.nothrow();
  assert.strictEqual(status.exitCode, 0, `daemon status should succeed: ${status.stderr}`);
  assert(status.stdout.includes("running"), "daemon should be running when onboarding exits");
  console.log("✓ onboarding keeps relay disabled and waits for daemon readiness\n");

  console.log("Test 2: --no-relay suppresses pairing for an already-running daemon");
  const enableRelay =
    await $`Q8IDEVAI_HOME=${q8idevaiHome} npx q8idevai daemon pair --home ${q8idevaiHome} --relay`.nothrow();
  assert.strictEqual(enableRelay.exitCode, 0, `relay enable should succeed: ${enableRelay.stderr}`);
  assert(enableRelay.stdout.includes("#offer="), "relay enable should produce a pairing offer");

  const noRelayOnboard = await $`Q8IDEVAI_HOME=${q8idevaiHome} npx q8idevai --no-relay`.nothrow();
  assert.strictEqual(
    noRelayOnboard.exitCode,
    0,
    `--no-relay onboarding should succeed: ${noRelayOnboard.stderr}`,
  );
  assert(
    !noRelayOnboard.stdout.includes("#offer="),
    "--no-relay onboarding should not include a pairing offer",
  );
  console.log("✓ --no-relay suppresses pairing for an already-running daemon\n");

  console.log("Test 3: non-interactive onboarding persists voice disabled config");
  const configRaw = await readFile(join(q8idevaiHome, "config.json"), "utf-8");
  const config = JSON.parse(configRaw) as {
    features?: {
      dictation?: { enabled?: boolean };
      voiceMode?: { enabled?: boolean };
    };
  };

  assert.strictEqual(
    config.features?.dictation?.enabled,
    false,
    "dictation.enabled should be false",
  );
  assert.strictEqual(
    config.features?.voiceMode?.enabled,
    false,
    "voiceMode.enabled should be false",
  );
  const daemonLog = await readFile(join(q8idevaiHome, "daemon.log"), "utf-8");
  assert(
    !daemonLog.includes("Ensuring local speech models"),
    "daemon should not attempt local speech model setup when voice is disabled",
  );
  console.log("✓ non-interactive run persisted voice disabled choices\n");
} finally {
  await $`Q8IDEVAI_HOME=${q8idevaiHome} npx q8idevai daemon stop --home ${q8idevaiHome} --force`.nothrow();
  await rm(q8idevaiHome, { recursive: true, force: true });
}

console.log("=== Onboarding tests passed ===");
