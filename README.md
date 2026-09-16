<p align="center">
  <img src="packages/website/public/logo.svg" width="64" height="64" alt="Q8iDevAI logo">
</p>

<h1 align="center">Q8iDevAI</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ar.md">العربية</a>
</p>

<p align="center">
  <a href="https://github.com/Q8iDevAI/Q8iDevAI/stargazers">
    <img src="https://img.shields.io/github/stars/Q8iDevAI/Q8iDevAI?style=flat&logo=github" alt="GitHub stars">
  </a>
  <a href="https://github.com/Q8iDevAI/Q8iDevAI/releases">
    <img src="https://img.shields.io/github/v/release/Q8iDevAI/Q8iDevAI?style=flat&logo=github" alt="GitHub release">
  </a>
</p>

<p align="center">One interface for Claude Code, Codex, Copilot, OpenCode, and Pi agents.</p>

<p align="center">
  <img src="https://Q8iDev.CoM/Q8iDevAI/hero-mockup.png" alt="Q8iDevAI app screenshot" width="100%">
</p>

<p align="center">
  <img src="https://Q8iDev.CoM/Q8iDevAI/mobile-mockup.png" alt="Q8iDevAI mobile app" width="100%">
</p>

Run agents in parallel on your own machines. Ship from your phone or your desk.

- **Self-hosted:** Agents run on your machine with your full dev environment. Use your tools, your configs, and your skills.
- **Multi-provider:** Claude Code, Codex, Copilot, OpenCode, and Pi through the same interface. Pick the right model for each job.
- **Voice control:** Dictate tasks or talk through problems in voice mode. Hands-free when you need it.
- **Cross-device:** iOS, Android, desktop, web, and CLI. Start work at your desk, check in from your phone, script it from the terminal.
- **Privacy-first:** Q8iDevAI doesn't have any telemetry, tracking, or forced log-ins.

## Plugins

Add themes, workspace panels, commands, settings screens, and coding-agent providers with trusted
TypeScript plugins. Install from a local directory or Git repository with `q8idevai plugin add <source>`.

See the [plugin docs](https://Q8iDev.CoM/Q8iDevAI/docs/plugins) for your Q8iDevAI version, or start with the
[0.8 beta quickstart](https://Q8iDev.CoM/Q8iDevAI/docs/plugins/v0.8). Plugins run with access to your daemon
machine and inside connected clients; install only code you trust.

## Getting Started

Q8iDevAI runs a local server called the daemon that manages your coding agents. Clients like the desktop app, mobile app, web app, and CLI connect to it.

### Prerequisites

You need at least one agent CLI installed and configured with your credentials:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex](https://github.com/openai/codex)
- [GitHub Copilot](https://github.com/features/copilot/cli/)
- [OpenCode](https://github.com/anomalyco/opencode)
- [Pi](https://pi.dev)

### Desktop app (recommended)

Download it from [Q8iDev.CoM/Q8iDevAI/download](https://Q8iDev.CoM/Q8iDevAI/download) or the [GitHub releases page](https://github.com/Q8iDevAI/Q8iDevAI/releases). Open the app and the daemon starts automatically. Nothing else to install.

To connect from your phone, open **Settings → your host → Pair Device**.

### CLI / headless

Install the CLI and start Q8iDevAI:

```bash
npm install -g @q8idevai/cli
q8idevai
```

Q8iDevAI starts locally, then asks whether to enable the end-to-end encrypted relay for device pairing. If you decline, connect directly over TCP, Tailscale, or another VPN. This path is useful for servers and remote machines.

For full setup and configuration, see:

- [Docs](https://Q8iDev.CoM/Q8iDevAI/docs)
- [Connectivity guide](https://Q8iDev.CoM/Q8iDevAI/docs/connectivity)
- [Configuration reference](https://Q8iDev.CoM/Q8iDevAI/docs/configuration)

### Docker

Run the Q8iDevAI daemon and self-hosted web UI in Docker:

```bash
docker run -d --name q8idevai \
  -p 6767:6767 \
  -e Q8IDEVAI_PASSWORD=change-me \
  -v "$PWD/q8idevai-home:/home/q8idevai" \
  -v "$PWD:/workspace" \
  ghcr.io/getq8idevai/q8idevai:latest
```

Open `http://localhost:6767` after it starts. Extend the base image with the agent CLIs you use, then provide credentials through environment variables or the persistent `/home/q8idevai` volume. See the [Docker documentation](docs/docker.md) for full setup details.

## CLI

Everything you can do in the app, you can do from the terminal.

```bash
q8idevai run --provider claude/opus-4.6 "implement user authentication"
q8idevai run --provider codex/gpt-5.5 --worktree feature-x "implement feature X"

q8idevai ls                           # list running agents
q8idevai attach abc123                # stream live output
q8idevai send abc123 "also add tests" # follow-up task

# run on a remote daemon; --cwd is a path on that host
q8idevai run --host workstation.local:6767 --cwd /workspace "run the full test suite"
```

See the [full CLI reference](https://Q8iDev.CoM/Q8iDevAI/docs/cli) for more.

## TypeScript SDK

Build issue integrations, dashboards, and orchestration services with `@q8idevai/client`:

```ts
import { createQ8iDevAIClient } from "@q8idevai/client";

const client = createQ8iDevAIClient({ url: "ws://127.0.0.1:6767/ws" });
await client.connect();

const agent = await client.agents.create({
  config: { provider: "codex/gpt-5.5" },
  cwd: "/Users/me/dev/storefront",
  prompt: "Review the current diff and name the riskiest change.",
});

const result = await agent.waitForFinish();
console.log(result.lastMessage);

await client.close();
```

See the [SDK quickstart](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/quickstart), [recipes](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/recipes), and [API reference](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/reference).

## Skills

Skills teach your agent to use Q8iDevAI to orchestrate other agents.

```bash
npx skills add Q8iDevAI/Q8iDevAI
```

Then use them in any agent conversation:

- `/q8idevai-handoff` — hand off work between agents. I use this to plan with Claude and then handoff to Codex to implement.
- `/q8idevai-advisor` — spin up a single agent as an advisor for a second opinion, without delegating the work itself.
- `/q8idevai-committee` — form a committee of two contrasting agents to step back, do root cause analysis, and produce a plan.

## Development

Quick monorepo package map:

- `packages/server`: Q8iDevAI daemon (agent process orchestration, WebSocket API, MCP server)
- `packages/app`: Expo client (iOS, Android, web)
- `packages/cli`: `q8idevai` CLI for daemon and agent workflows
- `packages/desktop`: Electron desktop app
- `packages/relay`: Relay transport and encryption used by the daemon and clients
- `packages/website`: Marketing site and documentation (`https://Q8iDev.CoM/Q8iDevAI/`)

Common commands:

```bash
# run all local dev services
npm run dev

# run individual surfaces
npm run dev:server
npm run dev:app
npm run dev:desktop
npm run dev:website

# build the server stack
npm run build:server

# repo-wide checks
npm run typecheck
```

## Related projects

- [getq8idevai/q8idevai-relay](https://github.com/Q8iDevAI/Q8iDevAI-relay) — official distributed relay, written in Elixir
- [q8idevai-vscode](https://marketplace.visualstudio.com/items?itemName=hinnes.q8idevai-vscode) — VS Code extension

## License

Apache-2.0
