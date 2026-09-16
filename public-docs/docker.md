---
title: Docker
description: Run the Q8iDevAI daemon and bundled web UI with the official Docker image.
nav: Docker
order: 6
category: Getting started
---

# Docker

The official Q8iDevAI Docker image runs the daemon and serves the bundled browser UI from the same HTTP origin. It is meant for servers, dev boxes, NAS devices, homelab hosts, and other places where you want Q8iDevAI running without the desktop app.

Docker images follow the stable Q8iDevAI release cadence. `ghcr.io/getq8idevai/q8idevai:latest` points at the latest stable release, not an arbitrary `main` build.

```bash
docker run -d --name q8idevai \
  -p 6767:6767 \
  -e Q8IDEVAI_PASSWORD=change-me \
  -v "$PWD/q8idevai-home:/home/q8idevai" \
  -v "$PWD:/workspace" \
  ghcr.io/getq8idevai/q8idevai:latest
```

Then open:

```text
http://localhost:6767
```

If you set `Q8IDEVAI_PASSWORD`, use that same password when adding the direct daemon connection in the web UI, mobile app, or CLI.

## What the image includes

The image:

- installs the Q8iDevAI daemon and CLI
- serves the bundled web UI
- listens on `0.0.0.0:6767` inside the container
- stores daemon state under `/home/q8idevai/.q8idevai`
- runs the daemon and launched agents as the non-root `q8idevai` user

The image does not bundle agent CLIs such as Claude Code, Codex, OpenCode, Copilot, or Pi. Add the agents you use with a small child image.

Host-side CLI commands select the container explicitly, for example `q8idevai project ls --host 127.0.0.1:6767`. Without an endpoint selector the CLI looks for a local home’s supervisor. Container environment settings are deployment overrides; worker restart preserves them. Your container manager owns full supervisor replacement.

## Docker Compose

```yaml
services:
  q8idevai:
    image: ghcr.io/getq8idevai/q8idevai:latest
    container_name: q8idevai
    restart: unless-stopped
    ports:
      - "6767:6767"
    environment:
      Q8IDEVAI_PASSWORD: "change-me"
      # Q8IDEVAI_HOSTNAMES: "q8idevai.example.com,.lan"
    volumes:
      - ./q8idevai-home:/home/q8idevai
      - ./workspace:/workspace
```

Start it:

```bash
docker compose up -d
```

## Install agent CLIs

Create a child image for the providers you want available:

```Dockerfile
FROM ghcr.io/getq8idevai/q8idevai:latest

USER root
RUN npm install -g @openai/codex @anthropic-ai/claude-code opencode-ai
```

Build it:

```bash
docker build -t q8idevai-with-agents .
```

Then use `image: q8idevai-with-agents` in Compose.

Leave the child image user as root. The base entrypoint uses root only for first-run mounted-volume setup, then drops the daemon and launched agents to the non-root `q8idevai` user.

You can authenticate agents either by passing provider environment variables or by running the provider login flow inside the container:

```bash
docker exec -it --user q8idevai q8idevai codex
docker exec -it --user q8idevai q8idevai claude
```

Agent credentials persist in `/home/q8idevai`.

## Volumes

Mount two paths for most deployments:

| Mount         | Purpose                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `/home/q8idevai` | Q8iDevAI state plus agent config and credentials such as `.codex`, `.claude` |
| `/workspace`  | Code that Q8iDevAI and launched agents can read and write                    |

On Linux, the built-in `q8idevai` user is uid/gid `1000:1000`. Make mounted directories writable by that user, or run the container with Docker's `--user` / Compose `user:` option.

## Reverse proxy

Forward normal HTTP traffic and WebSocket upgrades to the container.

Caddy:

```caddy
q8idevai.example.com {
  reverse_proxy 127.0.0.1:6767
}
```

Nginx:

```nginx
server {
    listen 443 ssl;
    server_name q8idevai.example.com;

    location / {
        proxy_pass http://127.0.0.1:6767;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you reach Q8iDevAI by DNS name, allow that host:

```yaml
environment:
  Q8IDEVAI_HOSTNAMES: "q8idevai.example.com,.lan"
```

IPs and `localhost` are allowed by default.

## Security

Set `Q8IDEVAI_PASSWORD` for any published port or network-reachable deployment. Use HTTPS at your reverse proxy for browser access outside localhost.

The static web UI is public on the daemon origin. The daemon API and WebSocket are protected by password auth when configured.

Agents can access whatever you mount into `/workspace` and whatever credentials you place in `/home/q8idevai`. Keep those mounts scoped to what the agents should be able to use.

See [Security](/docs/security) for the full daemon trust model.

## Troubleshooting

- **The UI loads but cannot connect:** if `Q8IDEVAI_PASSWORD` is set, add a direct connection with the same password.
- **403 Host not allowed:** set `Q8IDEVAI_HOSTNAMES` to the DNS names you use.
- **Provider not available:** install that agent CLI in a child image or make sure the binary is on `PATH`.
- **Permission errors in `/workspace`:** make the mounted directory writable by uid/gid `1000:1000`, or run the container as the host uid/gid.
- **Logs:** run `docker logs q8idevai`, or inspect `/home/q8idevai/.q8idevai/daemon.log` inside the container.
