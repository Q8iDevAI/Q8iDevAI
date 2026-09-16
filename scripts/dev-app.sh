#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export PATH="$ROOT_DIR/node_modules/.bin:$PATH"

source "$SCRIPT_DIR/dev-home.sh"

export Q8IDEVAI_LISTEN="${Q8IDEVAI_LISTEN:-127.0.0.1:6768}"
configure_dev_q8idevai_home

EXPO_PORT="${EXPO_PORT:-8081}"
DAEMON_ENDPOINT="$(resolve_dev_daemon_endpoint)"
DEV_BUILD_LABEL="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || true)"

echo "══════════════════════════════════════════════════════"
echo "  Q8iDevAI App Dev"
echo "══════════════════════════════════════════════════════"
echo "  Metro:   http://localhost:${EXPO_PORT}"
echo "  Daemon:  ${DAEMON_ENDPOINT}"
echo "  Home:    ${Q8IDEVAI_HOME}"
echo "══════════════════════════════════════════════════════"

exec cross-env \
  BROWSER="${BROWSER:-none}" \
  APP_VARIANT=development \
  EXPO_PUBLIC_Q8IDEVAI_DEV_BUILD_LABEL="$DEV_BUILD_LABEL" \
  EXPO_PUBLIC_LOCAL_DAEMON="$DAEMON_ENDPOINT" \
  npm run start:expo --workspace=@q8idevai/app -- --port "$EXPO_PORT"
