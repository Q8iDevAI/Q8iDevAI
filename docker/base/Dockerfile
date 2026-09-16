# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-bookworm-slim
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS source-pack

ARG Q8IDEVAI_VERSION

ENV ONNXRUNTIME_NODE_INSTALL=skip

WORKDIR /tmp/q8idevai-src
COPY . .

RUN set -eux; \
    if [ -n "${Q8IDEVAI_VERSION:-}" ]; then \
      test "$(node -p "require('./package.json').version")" = "${Q8IDEVAI_VERSION}"; \
    fi; \
    node -e 'const fs=require("node:fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); delete pkg.scripts.prepare; fs.writeFileSync("package.json", `${JSON.stringify(pkg)}\n`);'; \
    npm ci

RUN set -eux; \
    mkdir -p /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/highlight --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/relay --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/protocol --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/client --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/plugin --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/server --pack-destination /tmp/q8idevai-packs; \
    npm pack --workspace=@q8idevai/cli --pack-destination /tmp/q8idevai-packs

FROM ${NODE_IMAGE}

ENV HOME=/home/q8idevai \
    Q8IDEVAI_HOME=/home/q8idevai/.q8idevai \
    Q8IDEVAI_LISTEN=0.0.0.0:6767 \
    Q8IDEVAI_WEB_UI_ENABLED=true \
    Q8IDEVAI_LOG_FORMAT=json \
    Q8IDEVAI_LOG_LEVEL=info \
    CLAUDE_CONFIG_DIR=/home/q8idevai/.claude \
    CODEX_HOME=/home/q8idevai/.codex \
    XDG_CONFIG_HOME=/home/q8idevai/.config \
    XDG_DATA_HOME=/home/q8idevai/.local/share \
    XDG_STATE_HOME=/home/q8idevai/.local/state \
    XDG_CACHE_HOME=/home/q8idevai/.cache \
    ONNXRUNTIME_NODE_INSTALL=skip

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      git \
      gosu \
      lbzip2 \
      openssh-client \
      procps \
      tini; \
    rm -rf /var/lib/apt/lists/*

COPY --from=source-pack /tmp/q8idevai-packs /tmp/q8idevai-packs
RUN set -eux; \
	npm install -g /tmp/q8idevai-packs/*.tgz; \
    rm -rf /tmp/q8idevai-packs; \
    npm cache clean --force; \
    server_entry="$(npm root -g)/@q8idevai/server/dist/scripts/supervisor-entrypoint.js"; \
    test -f "$server_entry"; \
    printf '%s\n' "$server_entry" > /etc/q8idevai-server-entry; \
    node --check "$server_entry"

RUN set -eux; \
    existing_group="$(getent group 1000 | cut -d: -f1 || true)"; \
    if [ -n "$existing_group" ] && [ "$existing_group" != "q8idevai" ]; then \
      groupmod --new-name q8idevai "$existing_group"; \
    elif [ -z "$existing_group" ]; then \
      groupadd --gid 1000 q8idevai; \
    fi; \
    existing_user="$(getent passwd 1000 | cut -d: -f1 || true)"; \
    if [ -n "$existing_user" ] && [ "$existing_user" != "q8idevai" ]; then \
      usermod --login q8idevai --gid q8idevai --home /home/q8idevai --shell /bin/bash "$existing_user"; \
    elif [ -z "$existing_user" ]; then \
      useradd --uid 1000 --gid q8idevai --create-home --home-dir /home/q8idevai --shell /bin/bash q8idevai; \
    fi; \
    mkdir -p \
      /workspace \
      "$Q8IDEVAI_HOME" \
      "$CLAUDE_CONFIG_DIR" \
      "$CODEX_HOME" \
      "$XDG_CONFIG_HOME" \
      "$XDG_DATA_HOME" \
      "$XDG_STATE_HOME" \
      "$XDG_CACHE_HOME"; \
    chown -R q8idevai:q8idevai /home/q8idevai /workspace

COPY docker/base/rootfs/ /
RUN chmod +x /usr/local/bin/q8idevai-docker-entrypoint

WORKDIR /workspace

EXPOSE 6767
VOLUME ["/home/q8idevai"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const listen=process.env.Q8IDEVAI_LISTEN||'0.0.0.0:6767'; const m=listen.match(/:(\\d+)$/); const port=m?Number(m[1]):6767; require('http').get({hostname:'127.0.0.1',port,path:'/api/health'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/q8idevai-docker-entrypoint"]
