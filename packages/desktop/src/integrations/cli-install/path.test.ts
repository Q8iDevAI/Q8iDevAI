import { describe, expect, it } from "vitest";
import { resolveCliInstallSourcePath } from "./path";

describe("cli-install-path", () => {
  it("uses the bundled shim for packaged macOS installs", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "darwin",
        isPackaged: true,
        executablePath: "/Applications/Q8iDevAI.app/Contents/MacOS/Q8iDevAI",
        shimPath: "/Applications/Q8iDevAI.app/Contents/Resources/bin/q8idevai",
      }),
    ).toBe("/Applications/Q8iDevAI.app/Contents/Resources/bin/q8idevai");
  });

  it("prefers the original AppImage path on linux", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/tmp/.mount_q8idevai123/q8idevai",
        shimPath: "/tmp/.mount_q8idevai123/resources/bin/q8idevai",
        appImagePath: "/home/user/Applications/Q8iDevAI.AppImage",
      }),
    ).toBe("/home/user/Applications/Q8iDevAI.AppImage");
  });

  it("uses the bundled shim for packaged linux installs outside an AppImage", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/opt/Q8iDevAI/Q8iDevAI",
        shimPath: "/opt/Q8iDevAI/resources/bin/q8idevai",
      }),
    ).toBe("/opt/Q8iDevAI/resources/bin/q8idevai");
  });

  it("falls back to the shim on windows and in development", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "win32",
        isPackaged: true,
        executablePath: "C:\\Users\\user\\AppData\\Local\\Programs\\Q8iDevAI\\Q8iDevAI.exe",
        shimPath: "C:\\Users\\user\\AppData\\Local\\Programs\\Q8iDevAI\\resources\\bin\\q8idevai.cmd",
      }),
    ).toBe("C:\\Users\\user\\AppData\\Local\\Programs\\Q8iDevAI\\resources\\bin\\q8idevai.cmd");

    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: false,
        executablePath: "/opt/Q8iDevAI/Q8iDevAI",
        shimPath: "/opt/Q8iDevAI/resources/bin/q8idevai",
      }),
    ).toBe("/opt/Q8iDevAI/resources/bin/q8idevai");
  });
});
