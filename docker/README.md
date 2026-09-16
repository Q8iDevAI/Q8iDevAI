# Q8iDevAI Docker Image

This directory contains the official Q8iDevAI daemon image.

The image runs the daemon headless and serves the bundled web UI from the same
HTTP origin. Start it, then open the daemon URL in a browser.

```bash
docker run -d --name q8idevai \
  -p 6767:6767 \
  -e Q8IDEVAI_PASSWORD=change-me \
  -v "$PWD/q8idevai-home:/home/q8idevai" \
  -v "$PWD:/workspace" \
  ghcr.io/getq8idevai/q8idevai:latest
```

Then open `http://localhost:6767`.

The base image intentionally does not bundle agent CLIs. Extend it with the
agents you use:

```Dockerfile
FROM ghcr.io/getq8idevai/q8idevai:latest

USER root
RUN npm install -g @openai/codex @anthropic-ai/claude-code
```

See [docs/docker.md](../docs/docker.md) for Compose, reverse proxy, security,
agent auth, and troubleshooting notes.
