import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Activity, CircleHelp, Gift, Keyboard } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { GitHubIcon } from "@/components/icons/github-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHint,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppDiagnosticStore } from "@/diagnostics/store";
import { useKeyboardShortcutsAvailable } from "@/keyboard/availability";
import { useHostRuntimeIsConnected, useHosts } from "@/runtime/host-runtime";
import { useKeyboardShortcutsStore } from "@/stores/keyboard-shortcuts-store";
import { useSessionStore } from "@/stores/session-store";
import { ICON_SIZE, type Theme } from "@/styles/theme";
import type { HostProfile } from "@/types/host-connection";
import { formatVersionWithPrefix } from "@/desktop/updates/desktop-updates";
import { resolveAppVersion } from "@/utils/app-version";
import { openChangelog } from "@/changelog";
import { openExternalUrl } from "@/utils/open-external-url";

const GITHUB_ISSUE_URL = "https://github.com/Q8iDevAI/Q8iDevAI/issues/new";
const ThemedActivity = withUnistyles(Activity);
const ThemedCircleHelp = withUnistyles(CircleHelp);
const ThemedGift = withUnistyles(Gift);
const ThemedKeyboard = withUnistyles(Keyboard);
const ThemedGitHubIcon = withUnistyles(GitHubIcon);
const foregroundColorMapping = (theme: Theme) => ({ color: theme.colors.foreground });
const foregroundMutedColorMapping = (theme: Theme) => ({
  color: theme.colors.foregroundMuted,
});
const diagnosticLeadingIcon = (
  <ThemedActivity size={ICON_SIZE.sm} uniProps={foregroundMutedColorMapping} />
);
const shortcutsLeadingIcon = (
  <ThemedKeyboard size={ICON_SIZE.sm} uniProps={foregroundMutedColorMapping} />
);
const githubLeadingIcon = (
  <ThemedGitHubIcon size={ICON_SIZE.sm} uniProps={foregroundMutedColorMapping} />
);
const changelogLeadingIcon = (
  <ThemedGift size={ICON_SIZE.sm} uniProps={foregroundMutedColorMapping} />
);

function HostVersionHint({ host }: { host: HostProfile }) {
  const { t } = useTranslation();
  const isConnected = useHostRuntimeIsConnected(host.serverId);

  return (
    <DropdownMenuHint
      style={styles.versionHint}
      trailing={isConnected ? formatVersionWithPrefix(host.serverVersion) : null}
      testID={`sidebar-help-host-version-${host.serverId}`}
    >
      {host.displayName}
    </DropdownMenuHint>
  );
}

export function SidebarHelpMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const version = formatVersionWithPrefix(resolveAppVersion());
  const hosts = useHosts();
  const shortcutsAvailable = useKeyboardShortcutsAvailable();
  const setShortcutsDialogOpen = useKeyboardShortcutsStore((state) => state.setDialogOpen);
  const setDiagnosticOpen = useAppDiagnosticStore((state) => state.setOpen);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);

  const openDiagnostics = useCallback(() => {
    setDiagnosticOpen(true, activeSessionId);
  }, [activeSessionId, setDiagnosticOpen]);

  const openKeyboardShortcuts = useCallback(() => {
    setShortcutsDialogOpen(true);
  }, [setShortcutsDialogOpen]);

  const openGitHubIssue = useCallback(() => {
    void openExternalUrl(GITHUB_ISSUE_URL);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={300} enabledOnDesktop={!open}>
        <TooltipTrigger asChild>
          <View>
            <DropdownMenuTrigger
              style={styles.trigger}
              testID="sidebar-help"
              accessibilityRole="button"
              accessibilityLabel={t("sidebar.help.trigger")}
            >
              {({ hovered }) => (
                <ThemedCircleHelp
                  size={ICON_SIZE.md}
                  uniProps={hovered ? foregroundColorMapping : foregroundMutedColorMapping}
                />
              )}
            </DropdownMenuTrigger>
          </View>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" offset={8}>
          <Text style={styles.tooltipText}>{t("sidebar.help.trigger")}</Text>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="top" align="end" offset={8} width={280} testID="sidebar-help-menu">
        <DropdownMenuLabel>{t("sidebar.help.sectionHelp")}</DropdownMenuLabel>
        {shortcutsAvailable ? (
          <DropdownMenuItem
            testID="sidebar-help-shortcuts"
            leading={shortcutsLeadingIcon}
            onSelect={openKeyboardShortcuts}
          >
            {t("sidebar.help.keyboardShortcuts")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          testID="sidebar-help-diagnostics"
          leading={diagnosticLeadingIcon}
          onSelect={openDiagnostics}
        >
          {t("sidebar.help.diagnostics")}
        </DropdownMenuItem>
        <DropdownMenuItem
          testID="sidebar-help-changelog"
          leading={changelogLeadingIcon}
          onSelect={openChangelog}
        >
          {t("sidebar.help.changelog")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("sidebar.help.reportIssue")}</DropdownMenuLabel>
        <DropdownMenuItem
          testID="sidebar-help-github"
          leading={githubLeadingIcon}
          onSelect={openGitHubIssue}
        >
          {t("sidebar.help.github")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <View style={styles.versionList}>
          <DropdownMenuHint
            style={styles.versionHint}
            trailing={version}
            testID="sidebar-help-version"
          >
            {t("sidebar.help.appName")}
          </DropdownMenuHint>
          {hosts.map((host) => (
            <HostVersionHint key={host.serverId} host={host} />
          ))}
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const styles = StyleSheet.create((theme) => ({
  trigger: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[1],
  },
  tooltipText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.popoverForeground,
  },
  versionList: {
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
  },
  versionHint: {
    paddingVertical: 0,
  },
}));
