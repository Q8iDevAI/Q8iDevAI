#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$SCRIPT_DIR/../node_modules/.bin:$PATH"

source "$SCRIPT_DIR/dev-home.sh"

export Q8IDEVAI_LISTEN="${Q8IDEVAI_LISTEN:-127.0.0.1:6768}"
configure_dev_q8idevai_home

if [ -z "${Q8IDEVAI_LOCAL_MODELS_DIR}" ]; then
  export Q8IDEVAI_LOCAL_MODELS_DIR="$HOME/.q8idevai/models/local-speech"
  mkdir -p "$Q8IDEVAI_LOCAL_MODELS_DIR"
fi

echo "══════════════════════════════════════════════════════"
echo "  Q8iDevAI Dev Daemon"
echo "══════════════════════════════════════════════════════"
echo "  Home:    ${Q8IDEVAI_HOME}"
echo "  Models:  ${Q8IDEVAI_LOCAL_MODELS_DIR}"
echo "  Listen:  ${Q8IDEVAI_LISTEN}"
echo "══════════════════════════════════════════════════════"

export Q8IDEVAI_CORS_ORIGINS="${Q8IDEVAI_CORS_ORIGINS:-*}"
export Q8IDEVAI_NODE_INSPECT="${Q8IDEVAI_NODE_INSPECT:---inspect=0}"

if [ "${Q8IDEVAI_SKIP_DEV_SERVER_BUILD:-0}" = "1" ]; then
  exec npm run dev:server:watch
fi

exec sh -c 'npm run build:server-deps && npm run dev:server:watch'
