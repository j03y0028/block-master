#!/bin/bash
# Block Master container runner (used by blockmaster.service on myNode).
#   run.sh start   start db + api (detached) and web (foreground, so systemd tracks it)
#   run.sh stop    stop and remove the containers (data in /mnt/hdd/mynode/blockmaster is kept)
set -euo pipefail
ACTION="${1:-start}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${BLOCKMASTER_DATA:-/mnt/hdd/mynode/blockmaster}"
ENV_FILE="$DATA/blockmaster.env"
PROJECT=blockmaster
if docker compose version >/dev/null 2>&1; then DC=(docker compose); else DC=(docker-compose); fi
compose() { "${DC[@]}" -p "$PROJECT" --env-file "$ENV_FILE" -f "$HERE/docker-compose.yml" "$@"; }

[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (run install-mynode.sh)" >&2; exit 1; }
case "$ACTION" in
  stop)  compose down --timeout 60 || true ;;
  start)
    compose down --timeout 30 >/dev/null 2>&1 || true
    compose up -d db api
    exec "${DC[@]}" -p "$PROJECT" --env-file "$ENV_FILE" -f "$HERE/docker-compose.yml" up --no-deps web ;;
  *) echo "usage: run.sh start|stop" >&2; exit 2 ;;
esac
