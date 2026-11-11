#!/bin/bash
# Block Master - remove from myNode.   sudo ./uninstall-mynode.sh [--purge]
#   stops and removes the containers, the Block Master image and the app registration.
#   --purge also deletes /mnt/hdd/mynode/blockmaster (database, cache, settings).
# bitcoind, Electrs and myNode's built-in Mempool app are not touched.
set -euo pipefail
APP=blockmaster
ROOT="${MYNODE_ROOT:-}"
SIM="${MYNODE_SIM:-0}"
PURGE=0
for a in "$@"; do case "$a" in --purge) PURGE=1 ;; -h|--help) sed -n '2,6p' "$0"; exit 0 ;; *) echo "unknown option: $a" >&2; exit 2 ;; esac; done
[ "$SIM" = 1 ] || [ "$(id -u)" = 0 ] || { echo "run as root: sudo $0" >&2; exit 1; }
DATA="$ROOT/mnt/hdd/mynode/$APP"

if [ "$SIM" != 1 ]; then
    systemctl stop "$APP" 2>/dev/null || true
    systemctl disable "$APP" 2>/dev/null || true
    rm -f "/mnt/hdd/mynode/settings/${APP}_enabled"
    if command -v mynode-manage-apps >/dev/null; then mynode-manage-apps uninstall "$APP" || true; fi
    [ -f "$ROOT/opt/mynode/$APP/app_data/run.sh" ] && bash "$ROOT/opt/mynode/$APP/app_data/run.sh" stop || true
    docker image ls --format '{{.Repository}}:{{.Tag}}' | grep '^blockmaster/frontend:' | xargs -r docker rmi -f >/dev/null || true
fi
rm -rf "${ROOT}/usr/share/mynode_apps/$APP"
if [ "$PURGE" = 1 ]; then rm -rf "${DATA:?}"; echo "Removed $DATA"; else echo "Kept $DATA (use --purge to delete it)"; fi
echo "Block Master removed."
