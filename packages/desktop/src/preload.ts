import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { BrowserKeyboardPolicy } from "./features/browser-keyboard/index.js";
import type { DesktopWindowChromeMode } from "./window/chrome.js";

// This preload runs in Electron's sandbox and is tsc-compiled (not bundled), so it MUST
// NOT emit any runtime module load other than "electron" — a require() of a local or
// third-party module throws and aborts the preload before exposeInMainWorld runs, leaving
// window.q8idevaiDesktop undefined (the 0.1.108 regression, #2103). Keep this literal in sync
// with Q8IDEVAI_BROWSER_PROFILE_PARTITION in features/browser-profile.ts; preload-sandbox.test.ts
// guards both the no-local-import rule and this drift. Type-only imports are fine (erased at emit).
const Q8IDEVAI_BROWSER_PROFILE_PARTITION = "persist:q8idevai-browser";

type EventHandler = (payload: unknown) => void;

function readWindowChromeMode(): DesktopWindowChromeMode {
  const prefix = "--q8idevai-window-chrome-mode=";
  const value = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (value === "native-mac" || value === "custom-windows" || value === "custom-linux") {
    return value;
  }
  // COMPAT(windowChromeMode): added in v0.5.3; remove after 2026-11-25.
  if (process.platform === "darwin") return "native-mac";
  return process.platform === "linux" ? "custom-linux" : "custom-windows";
}

interface AttachedBrowserRegistration {
  browserId: string;
  workspaceId: string;
  webContentsId: number;
}

contextBridge.exposeInMainWorld("q8idevaiDesktop", {
  platform: process.platform,
  windowChromeMode: readWindowChromeMode(),
  invoke: (command: string, args?: Record<string, unknown>) =>
    ipcRenderer.invoke("q8idevai:invoke", command, args),
  getPendingOpenProject: () =>
    ipcRenderer.invoke("q8idevai:get-pending-open-project") as Promise<string | null>,
  agentNavigation: {
    ready: () =>
      ipcRenderer.invoke("q8idevai:agent-navigation:ready") as Promise<{
        serverId: string;
        agentId: string;
      } | null>,
  },
  events: {
    on: (event: string, handler: EventHandler): Promise<() => void> => {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: unknown) => {
        handler(payload);
      };
      ipcRenderer.on(`q8idevai:event:${event}`, listener);
      return Promise.resolve(() => {
        ipcRenderer.removeListener(`q8idevai:event:${event}`, listener);
      });
    },
  },
  window: {
    openNew: (options?: { pendingOpenProjectPath?: string | null }) =>
      ipcRenderer.invoke("q8idevai:window:openNew", options),
    getCurrentWindow: () => ({
      minimize: () => ipcRenderer.invoke("q8idevai:window:minimize"),
      close: () => ipcRenderer.invoke("q8idevai:window:close"),
      toggleMaximize: () => ipcRenderer.invoke("q8idevai:window:toggleMaximize"),
      isMaximized: () => ipcRenderer.invoke("q8idevai:window:isMaximized"),
      setFullscreen: (fullscreen: boolean) =>
        ipcRenderer.invoke("q8idevai:window:setFullscreen", fullscreen),
      isFullscreen: () => ipcRenderer.invoke("q8idevai:window:isFullscreen"),
      updateChrome: (update: { backgroundColor?: string; trafficLightOffsetY?: number }) =>
        ipcRenderer.invoke("q8idevai:window:updateChrome", update),
      onResized: (handler: EventHandler): (() => void) => {
        const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: unknown) => {
          handler(payload);
        };
        ipcRenderer.on("q8idevai:window:resized", listener);
        return () => {
          ipcRenderer.removeListener("q8idevai:window:resized", listener);
        };
      },
      setBadgeCount: (count?: number) => ipcRenderer.invoke("q8idevai:window:setBadgeCount", count),
    }),
  },
  dialog: {
    ask: (message: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke("q8idevai:dialog:ask", message, options),
    askWithCheckbox: (message: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke("q8idevai:dialog:askWithCheckbox", message, options),
    open: (options?: Record<string, unknown>) => ipcRenderer.invoke("q8idevai:dialog:open", options),
  },
  notification: {
    isSupported: () => ipcRenderer.invoke("q8idevai:notification:isSupported"),
    sendNotification: (payload: { title: string; body?: string; data?: Record<string, unknown> }) =>
      ipcRenderer.invoke("q8idevai:notification:send", payload),
  },
  opener: {
    openUrl: (url: string) => ipcRenderer.invoke("q8idevai:opener:openUrl", url),
  },
  editor: {
    listTargets: () => ipcRenderer.invoke("q8idevai:editor:listTargets"),
    openTarget: (input: {
      editorId: string;
      workspacePath: string;
      filePath?: string;
      line?: number;
      column?: number;
    }) => ipcRenderer.invoke("q8idevai:editor:openTarget", input),
  },
  webUtils: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  menu: {
    showContextMenu: (input?: Record<string, unknown>) =>
      ipcRenderer.invoke("q8idevai:menu:showContextMenu", input),
    setCapturingShortcut: (capturing: boolean) =>
      ipcRenderer.invoke("q8idevai:menu:set-capturing-shortcut", capturing),
  },
  browser: {
    setShortcutPolicy: (input: BrowserKeyboardPolicy) =>
      ipcRenderer.invoke("q8idevai:browser:set-shortcut-policy", input),
    profilePartition: Q8IDEVAI_BROWSER_PROFILE_PARTITION,
    registerAttachedBrowser: (input: AttachedBrowserRegistration) =>
      ipcRenderer.invoke("q8idevai:browser:register-attached", input),
    unregisterWorkspaceBrowser: (browserId: string) =>
      ipcRenderer.invoke("q8idevai:browser:unregister-workspace-browser", browserId),
    setWorkspaceActiveBrowser: (input: { workspaceId: string; browserId: string | null }) =>
      ipcRenderer.invoke("q8idevai:browser:set-workspace-active-browser", input),
    focus: (browserId: string) => ipcRenderer.invoke("q8idevai:browser:focus", browserId),
    openDevTools: (browserId: string) =>
      ipcRenderer.invoke("q8idevai:browser:open-devtools", browserId),
    clearProfile: (legacyBrowserIds: string[]) =>
      ipcRenderer.invoke("q8idevai:browser:clear-profile", legacyBrowserIds),
    executeAutomationCommand: (request: Record<string, unknown>) =>
      ipcRenderer.invoke("q8idevai:browser:execute-automation-command", request),
    captureElement: (
      browserId: string,
      rect: { x: number; y: number; width: number; height: number },
    ) => ipcRenderer.invoke("q8idevai:browser:capture-element", browserId, rect),
    copyElement: (payload: { text?: string; imageDataUrl?: string }) =>
      ipcRenderer.invoke("q8idevai:browser:copy-element", payload),
  },
});
