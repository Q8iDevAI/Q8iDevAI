#!/usr/bin/env npx zx

/**
 * Phase 1: Foundation Tests
 *
 * Tests basic CLI functionality that doesn't require a daemon:
 * - q8idevai --version outputs version
 * - q8idevai --help shows commands
 */

import { $ } from "zx";

$.verbose = false;

console.log("📋 Phase 1: Foundation Tests\n");

// Test 1.1: --version outputs version
console.log("  Testing q8idevai --version...");
const versionResult = await $`q8idevai --version`.nothrow();
if (versionResult.exitCode !== 0) {
  console.error("  ❌ q8idevai --version failed with exit code", versionResult.exitCode);
  console.error("     stderr:", versionResult.stderr);
  process.exit(1);
}
const versionOutput = versionResult.stdout.trim();
if (!versionOutput.match(/\d+\.\d+\.\d+/)) {
  console.error("  ❌ q8idevai --version output does not contain version number");
  console.error("     output:", versionOutput);
  process.exit(1);
}
console.log("  ✅ q8idevai --version outputs:", versionOutput);

// Test 1.2: --help shows commands
console.log("  Testing q8idevai --help...");
const helpResult = await $`q8idevai --help`.nothrow();
if (helpResult.exitCode !== 0) {
  console.error("  ❌ q8idevai --help failed with exit code", helpResult.exitCode);
  console.error("     stderr:", helpResult.stderr);
  process.exit(1);
}
const helpOutput = helpResult.stdout;

// Check for expected sections in help output
const expectedTerms = ["agent", "daemon", "Usage", "Options", "Commands"];
const missingTerms = expectedTerms.filter((term) => !helpOutput.includes(term));
if (missingTerms.length > 0) {
  console.error("  ❌ q8idevai --help missing expected terms:", missingTerms.join(", "));
  console.error("     output:", helpOutput);
  process.exit(1);
}
console.log("  ✅ q8idevai --help shows commands");

console.log("\n✅ Phase 1: Foundation Tests PASSED");
