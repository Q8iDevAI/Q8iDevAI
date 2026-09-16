import { mkdtemp, open, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  acquirePidLock,
  getPidLockInfo,
  isLocked,
  PidLockError,
  refreshPidLock,
  releasePidLock,
  updatePidLock,
} from "./pid-lock.js";

describe("pid-lock ownership", () => {
  test("writes and releases lock for explicit owner pid", async () => {
    const parent = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-owner-"));
    const q8idevaiHome = join(parent, "home");
    const ownerPid = process.pid + 10_000;

    try {
      await (
        acquirePidLock as unknown as (
          home: string,
          sockPath: string | null,
          options: { ownerPid: number },
        ) => Promise<void>
      )(q8idevaiHome, null, { ownerPid });

      if (process.platform !== "win32") {
        expect((await stat(q8idevaiHome)).mode & 0o777).toBe(0o700);
      }
      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(ownerPid);
      expect(lock?.listen).toBeNull();
      expect(lock?.heartbeat).toBe(true);

      await (
        updatePidLock as unknown as (
          home: string,
          patch: { listen: string },
          options: { ownerPid: number },
        ) => Promise<void>
      )(q8idevaiHome, { listen: "127.0.0.1:6767" }, { ownerPid });

      const updatedLock = await getPidLockInfo(q8idevaiHome);
      expect(updatedLock?.listen).toBe("127.0.0.1:6767");

      await (
        releasePidLock as unknown as (home: string, options: { ownerPid: number }) => Promise<void>
      )(q8idevaiHome, { ownerPid: ownerPid + 1 });
      const lockAfterWrongOwnerRelease = await getPidLockInfo(q8idevaiHome);
      expect(lockAfterWrongOwnerRelease?.pid).toBe(ownerPid);

      await (
        releasePidLock as unknown as (home: string, options: { ownerPid: number }) => Promise<void>
      )(q8idevaiHome, { ownerPid });
      const lockAfterOwnerRelease = await getPidLockInfo(q8idevaiHome);
      expect(lockAfterOwnerRelease).toBeNull();
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("keeps a stale heartbeat lock when the recorded pid is alive without a reachability check", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-stale-heartbeat-"));
    const replacementOwnerPid = process.pid + 10_000;

    try {
      const pidPath = join(q8idevaiHome, "q8idevai.pid");
      await writeFile(
        pidPath,
        JSON.stringify({
          pid: process.pid,
          startedAt: "2026-01-01T00:00:00.000Z",
          hostname: "old-host",
          uid: process.getuid?.() ?? 0,
          listen: "127.0.0.1:6767",
          desktopManaged: true,
          heartbeat: true,
        }),
      );
      const staleTime = new Date(Date.now() - 10 * 60_000);
      await utimes(pidPath, staleTime, staleTime);

      await expect(isLocked(q8idevaiHome)).resolves.toMatchObject({ locked: true });
      await expect(
        acquirePidLock(q8idevaiHome, null, { ownerPid: replacementOwnerPid }),
      ).rejects.toThrow("Another Q8iDevAI daemon is already running");

      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(process.pid);
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("preserves a stale live desktop heartbeat lock", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-stale-desktop-heartbeat-"));
    const replacementOwnerPid = process.pid + 10_000;

    try {
      const pidPath = join(q8idevaiHome, "q8idevai.pid");
      await writeFile(
        pidPath,
        JSON.stringify({
          pid: process.pid,
          startedAt: "2026-01-01T00:00:00.000Z",
          hostname: "old-host",
          uid: process.getuid?.() ?? 0,
          listen: "127.0.0.1:6767",
          desktopManaged: true,
          heartbeat: true,
        }),
      );
      const staleTime = new Date(Date.now() - 10 * 60_000);
      await utimes(pidPath, staleTime, staleTime);

      await expect(
        acquirePidLock(q8idevaiHome, null, { ownerPid: replacementOwnerPid }),
      ).rejects.toThrow("Another Q8iDevAI daemon is already running");

      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(process.pid);
      expect(lock?.listen).toBe("127.0.0.1:6767");
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("keeps a stale live lock written by a pre-heartbeat daemon", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-legacy-live-"));
    const pidPath = join(q8idevaiHome, "q8idevai.pid");

    try {
      await writeFile(
        pidPath,
        JSON.stringify({
          pid: process.pid,
          startedAt: "2026-01-01T00:00:00.000Z",
          hostname: "old-host",
          uid: process.getuid?.() ?? 0,
          listen: "127.0.0.1:6767",
          desktopManaged: true,
        }),
      );
      const staleTime = new Date(Date.now() - 10 * 60_000);
      await utimes(pidPath, staleTime, staleTime);

      await expect(
        acquirePidLock(q8idevaiHome, null, { ownerPid: process.pid + 10_000 }),
      ).rejects.toThrow("Another Q8iDevAI daemon is already running");

      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(process.pid);
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("preserves a stale live legacy desktop lock", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-legacy-desktop-"));
    const replacementOwnerPid = process.pid + 10_000;
    const pidPath = join(q8idevaiHome, "q8idevai.pid");

    try {
      await writeFile(
        pidPath,
        JSON.stringify({
          pid: process.pid,
          startedAt: "2026-01-01T00:00:00.000Z",
          hostname: "old-host",
          uid: process.getuid?.() ?? 0,
          listen: "127.0.0.1:6767",
          desktopManaged: true,
        }),
      );
      const staleTime = new Date(Date.now() - 10 * 60_000);
      await utimes(pidPath, staleTime, staleTime);

      await expect(
        acquirePidLock(q8idevaiHome, null, { ownerPid: replacementOwnerPid }),
      ).rejects.toThrow("Another Q8iDevAI daemon is already running");

      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(process.pid);
      expect(lock?.heartbeat).toBeUndefined();
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("rejects a heartbeat refresh after another supervisor takes ownership", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-refresh-owner-"));

    try {
      await acquirePidLock(q8idevaiHome, null, { ownerPid: process.pid + 10_000 });

      await expect(refreshPidLock(q8idevaiHome, { ownerPid: process.pid })).rejects.toBeInstanceOf(
        PidLockError,
      );
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("retries a heartbeat refresh while its owner is rewriting the lock", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-refresh-rewrite-"));
    const pidPath = join(q8idevaiHome, "q8idevai.pid");

    try {
      await acquirePidLock(q8idevaiHome, null, { ownerPid: process.pid });
      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock).not.toBeNull();

      const rewriteHandle = await open(pidPath, "r+");
      await rewriteHandle.truncate(0);

      const refresh = refreshPidLock(q8idevaiHome, { ownerPid: process.pid });
      await new Promise((resolve) => setTimeout(resolve, 250));
      await rewriteHandle.writeFile(JSON.stringify(lock));
      await rewriteHandle.close();

      await expect(refresh).resolves.toBeUndefined();
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });

  test("keeps a fresh lock when the recorded pid is alive", async () => {
    const q8idevaiHome = await mkdtemp(join(tmpdir(), "q8idevai-pid-lock-fresh-heartbeat-"));

    try {
      await writeFile(
        join(q8idevaiHome, "q8idevai.pid"),
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
          hostname: "current-host",
          uid: process.getuid?.() ?? 0,
          listen: "127.0.0.1:6767",
          desktopManaged: true,
          heartbeat: true,
        }),
      );

      await expect(
        acquirePidLock(q8idevaiHome, null, { ownerPid: process.pid + 10_000 }),
      ).rejects.toThrow("Another Q8iDevAI daemon is already running");

      const lock = await getPidLockInfo(q8idevaiHome);
      expect(lock?.pid).toBe(process.pid);
      expect(lock?.listen).toBe("127.0.0.1:6767");
    } finally {
      await rm(q8idevaiHome, { recursive: true, force: true });
    }
  });
});
