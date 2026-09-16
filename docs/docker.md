# Running Q8iDevAI in Docker

Q8iDevAI publishes a container image for running the daemon on a server, VM, NAS,
or homelab box. The image also serves the bundled browser web UI, so one
container gives you both the daemon API and a self-hosted UI.

The image source lives in [`docker/`](../docker/).

## How it works

The official image:

- builds `@q8idevai/server` and `@q8idevai/cli` from source-built workspace tarballs
- runs the daemon as the non-root `q8idevai` user
- listens on `0.0.0.0:6767` inside the container
- enables the bundled daemon web UI with `Q8IDEVAI_WEB_UI_ENABLED=true`
- stores daemon state and agent credentials under `/home/q8idevai`
- leaves agent CLIs out of the base image

Open the container's HTTP origin, for example `http://localhost:6767`, to load
the web UI. The served app receives a same-origin connection hint and connects
back to that daemon. Static UI files load without daemon auth; API and
WebSocket requests still require `Q8IDEVAI_PASSWORD` when one is configured.

Host-side CLI commands select the container explicitly, for example `q8idevai project ls --host 127.0.0.1:6767`. Without an endpoint selector the CLI looks for a local home’s supervisor. Container environment settings are deployment overrides; worker restart preserves them. Your container manager owns full supervisor replacement.

## Quick Start

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

If you set `Q8IDEVAI_PASSWORD`, enter the same password when adding the direct
daemon connection in the web UI or another Q8iDevAI client.

## Docker Compose

Use [`docker/docker-compose.example.yml`](../docker/docker-compose.example.yml):

```bash
cp docker/docker-compose.example.yml docker-compose.yml
$EDITOR docker-compose.yml
docker compose up -d
```

Minimal example:

```yaml
services:
  q8idevai:
    image: ghcr.io/getq8idevai/q8idevai:latest
    restart: unless-stopped
    ports:
      - "6767:6767"
    environment:
      Q8IDEVAI_PASSWORD: "change-me"
    volumes:
      - ./q8idevai-home:/home/q8idevai
      - ./workspace:/workspace
```

## Installing Agents

The base image does not preinstall Claude Code, Codex, OpenCode, Copilot, Pi, or
other agent CLIs. That keeps the default image small and avoids coupling Q8iDevAI
releases to third-party agent release cycles.

Create a child image for the agents you use:

```Dockerfile
FROM ghcr.io/getq8idevai/q8idevai:latest

USER root
RUN npm install -g @openai/codex @anthropic-ai/claude-code opencode-ai
```

Build it:

```bash
docker build -f Dockerfile -t q8idevai-with-agents .
```

Then use `image: q8idevai-with-agents` in Compose.

Leave the child image user as root. The base entrypoint uses root only for
first-run directory setup, then drops the daemon and launched agents to the
non-root `q8idevai` user.

An example child image is in
[`docker/Dockerfile.agents.example`](../docker/Dockerfile.agents.example).

You can also mount credentials from the host or run agent login once inside the
container:

```bash
docker exec -it --user q8idevai q8idevai codex
docker exec -it --user q8idevai q8idevai claude
```

Agent credentials and config persist in `/home/q8idevai`, alongside daemon state.
Provider environment variables such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`OPENAI_BASE_URL`, or `ANTHROPIC_BASE_URL` can be passed through `docker run -e`
or `compose.environment`; Q8iDevAI passes them to launched agents.

## Volumes

| Mount         | Purpose                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `/home/q8idevai` | Q8iDevAI state under `.q8idevai` plus agent config such as `.codex`, `.claude` |
| `/workspace`  | Code that Q8iDevAI and launched agents can read and write                   |

The image defaults:

| Variable       | Default              |
| -------------- | -------------------- |
| `HOME`         | `/home/q8idevai`        |
| `Q8IDEVAI_HOME`   | `/home/q8idevai/.q8idevai` |
| `Q8IDEVAI_LISTEN` | `0.0.0.0:6767`       |

If you bind-mount host directories on Linux, make sure the container user can
write them. The built-in `q8idevai` user has uid/gid `1000:1000`. For a different
host uid/gid, either adjust ownership on the mounted directories or run the
container with Docker's `--user` / Compose `user:` option.

## Reverse Proxies

When serving Q8iDevAI behind a reverse proxy, forward normal HTTP requests and
WebSocket upgrades to the same daemon port.

Caddy example:

```caddy
q8idevai.example.com {
  reverse_proxy 127.0.0.1:6767
}
```

Nginx example:

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

If you reach the daemon by DNS name, set `Q8IDEVAI_HOSTNAMES` so host-header
validation allows that name:

```yaml
environment:
  Q8IDEVAI_HOSTNAMES: "q8idevai.example.com,.lan"
```

IPs and `localhost` are allowed by default.

## Security

- Set `Q8IDEVAI_PASSWORD` for any published port or network-reachable deployment.
- Prefer HTTPS at the reverse proxy for direct browser access.
- Use the [official Q8iDevAI relay](https://github.com/Q8iDevAI/Q8iDevAI-relay) for
  untrusted networks or mobile access when you do not want to expose the daemon
  port directly.
- The container is the isolation boundary for agents. Agents can read and write
  whatever you mount into `/workspace` and whatever credentials you place in
  `/home/q8idevai`.
- The bundled web UI static files are public on the daemon origin. The daemon
  API and WebSocket remain protected by password auth when configured.

See [SECURITY.md](../SECURITY.md) for the daemon trust model.

## Building Locally

```bash
docker build -f docker/base/Dockerfile -t q8idevai:local .
```

To assert the source tree version while building:

```bash
docker build \
  --build-arg Q8IDEVAI_VERSION=0.1.102 \
  -t q8idevai:0.1.102 \
  -f docker/base/Dockerfile \
  .
```

The Docker workflow builds the image on pull requests and on `main` as a
non-publishing check. Stable `vX.Y.Z` tag pushes publish
`ghcr.io/getq8idevai/q8idevai:X.Y.Z` and `ghcr.io/getq8idevai/q8idevai:latest`. Beta tags
publish only the exact prerelease tag, such as
`ghcr.io/getq8idevai/q8idevai:0.1.102-beta.1`, and do not update `latest`.

To replace a Docker image in place without rebuilding desktop, APK, or EAS
mobile release artifacts, dispatch the Docker workflow manually instead of
pushing a `v*` release tag:

```bash
gh workflow run docker.yml \
  --ref main \
  -f q8idevai_version=0.1.102-beta.1 \
  -f publish=true
```

Manual Docker publishes require an explicit `q8idevai_version`. The workflow builds
from the checked-out source tree and publishes only the exact prerelease image
tag for prerelease versions.

The published image is multi-arch for `linux/amd64` and `linux/arm64`.

## Troubleshooting

- **The web UI loads but cannot connect**: if `Q8IDEVAI_PASSWORD` is set, add a
  direct connection with the same password.
- **403 Host not allowed**: set `Q8IDEVAI_HOSTNAMES` to the DNS names you use.
- **Provider not available**: install that agent CLI in a child image or mount a
  runtime where the binary is on `PATH`.
- **Permission errors in `/workspace`**: make the mounted directory writable by
  uid/gid `1000:1000`, or run the container as the host uid/gid.
- **Logs**: inspect `docker logs q8idevai` or
  `/home/q8idevai/.q8idevai/daemon.log` inside the container.
