---
title: Troubleshooting
description: Why Q8iDevAI can't find a provider you've installed, and how to fix the PATH and environment mismatches behind most setup issues.
nav: Common problems
order: 90
category: Troubleshooting
---

# Troubleshooting

Almost every "it works in my terminal but not in Q8iDevAI" problem is the same thing: Q8iDevAI and your terminal aren't searching the same `PATH`. This page covers how to spot that and fix it.

## Q8iDevAI can't find my provider

A provider you've installed shows as **Not installed**.

Q8iDevAI launches the agent CLIs you've already installed, it doesn't bundle them (see [Providers](/docs/providers)). So it has to find the command on its own `PATH`. If your shell only adds that location to `PATH` under certain conditions, Q8iDevAI can miss it.

### See what Q8iDevAI sees

Open **Settings → your host → Providers**, tap the provider, then tap **Diagnostic**. The rows that matter:

- **Resolved path** — where Q8iDevAI found the binary, or `not found`.
- **Daemon PATH** — the `PATH` Q8iDevAI is searching. Compare it to `echo $PATH` in a fresh terminal.
- **Version** — whether the binary actually runs.

From a terminal or agent, request the same diagnostic from the affected daemon:

```bash
q8idevai provider diagnostic <provider>
q8idevai --host <host:port> provider diagnostic <provider> --json
```

Use the global `--host` option when the affected daemon is not the CLI's default local daemon.

`not found` together with a **Daemon PATH** that's missing your binary's directory is the common case: that directory is on your terminal's `PATH` but not on Q8iDevAI's.

### Fix it

The durable fix is to make sure the command is on `PATH` for a normal login shell, then restart Q8iDevAI, see [why Q8iDevAI's environment can differ](#why-q8idevais-environment-can-differ-from-your-terminal) for why that's the test that matters.

If you'd rather pin it directly, set the binary path in `~/.q8idevai/config.json`:

```json
{
  "agents": {
    "providers": {
      "claude": {
        "command": ["/absolute/path/to/claude"]
      }
    }
  }
}
```

`command` is `[binary, ...args]` and fully replaces the default launch command for that provider. Find the real path with `which -a claude`. `type -a claude` also tells you if `claude` is only a shell alias or function, those won't work, Q8iDevAI runs the binary directly, so use the path it points to. Reload the configuration after editing (see [below](#i-changed-configjson-but-nothing-happened)).

For alternative endpoints, multiple profiles, custom binaries, and ACP agents, see [Custom providers](/docs/custom-providers). For per-agent install links, see [Supported providers](/docs/supported-providers).

## Why Q8iDevAI's environment can differ from your terminal

The same mismatch shows up anywhere Q8iDevAI runs your tools, an agent, or a terminal, reporting `command not found` for something you use every day.

When you open the **desktop app** from the Dock or Finder, the OS hands it a stripped-down environment, not your terminal's `PATH`. To compensate, Q8iDevAI runs your login shell once at startup (`$SHELL -i -l -c`), captures its environment, and hands that to the daemon and everything it spawns. The rule of thumb: **if a brand-new terminal can run the command, Q8iDevAI should too.** That's also the test, open a fresh terminal and try it there.

When you start the daemon yourself from a terminal (`q8idevai`), there's no login-shell step, it simply inherits that terminal's environment.

Either way, the fix for a missing tool lives in your shell config (`.zshrc`, `.zprofile`, …), not in Q8iDevAI. Tools installed through version managers (asdf, mise, nvm, …) are the usual offenders, make sure they initialize for a clean login shell, not only inside one you've already opened.

This login-shell step runs on macOS and Linux. On Windows, Q8iDevAI uses the environment it was launched with.

## Reading the logs

- **Desktop app** — the login-shell resolution is logged here. Look for `[login-shell-env]`: `applied` means it worked (it logs the `PATH` before and after); `failed; keeping inherited env` means it fell back to the stripped-down environment, with a `reason` (a timeout, a non-zero exit from your shell config, no output, …). A slow or erroring `.zshrc`/`.zprofile` is the usual cause.
- **Daemon** — `~/.q8idevai/daemon.log` (`$Q8IDEVAI_HOME/daemon.log` if you've set a custom home).

Desktop app log location:

| Platform | Path                            |
| -------- | ------------------------------- |
| macOS    | `~/Library/Logs/Q8iDevAI/main.log` |
| Linux    | `~/.config/Q8iDevAI/logs/main.log` |
| Windows  | `%APPDATA%\Q8iDevAI\logs\main.log` |

## I changed config.json but nothing happened

Reload the file after editing:

```bash
q8idevai reload
```

Q8iDevAI applies runtime-safe settings and names any paths that require a restart. Invalid JSON or a schema error applies nothing; fix the reported error and run the command again. If a launch environment variable or flag owns a changed setting, reload reports it separately.

Run `q8idevai daemon restart` only when reload requests it. In the app, open **Settings → your host → Overview** and use **Restart daemon**. Running agents keep going, and clients reconnect automatically.

## Still stuck?

- [Custom providers](/docs/custom-providers) — endpoints, profiles, binaries, ACP agents.
- [Configuration](/docs/configuration) — `config.json`, environment variables, logging.
- [How Q8iDevAI resolves your login shell](https://github.com/Q8iDevAI/Q8iDevAI/blob/main/packages/desktop/src/login-shell-env.ts) — the exact code that loads your shell environment.
- [Report an issue](https://github.com/Q8iDevAI/Q8iDevAI/issues).
