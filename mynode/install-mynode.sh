#!/bin/bash
# Block Master - myNode installer.  Run ON the myNode as root:   sudo ./install-mynode.sh
#
# What it does (each step is idempotent, re-running is safe and keeps your database):
#   1. checks this is a myNode with Docker, Bitcoin and Electrs, and that the package matches the CPU
#   2. copies the app folder to /usr/share/mynode_apps/blockmaster and registers it (mynode-manage-apps init)
#   3. writes /mnt/hdd/mynode/blockmaster/blockmaster.env (mode 600) with generated database passwords
#      (the Bitcoin RPC password is read from myNode's own settings on every start, like the built-in Mempool app)
#   4. installs: loads the Block Master web image from this package and pulls the pinned backend + MariaDB images
#   5. enables + starts the blockmaster service and waits for http://mynode.local:4090
# Nothing about bitcoind is changed and bitcoind is not restarted.
#
# Options:  --yes        don't ask
#           --port=N     HTTP port (default 4090; https via myNode nginx on 4091)
# Simulation/testing:  MYNODE_ROOT=/tmp/fake-root MYNODE_SIM=1  (no app manager, docker or systemd calls)
set -euo pipefail

APP=blockmaster
ROOT="${MYNODE_ROOT:-}"
SIM="${MYNODE_SIM:-0}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANAGE="${MYNODE_MANAGE_APPS:-mynode-manage-apps}"
USE_MANAGE=1; [ "$SIM" = 1 ] && [ -z "${MYNODE_MANAGE_APPS:-}" ] && USE_MANAGE=0
YES=0; PORT=4090
for a in "$@"; do
    case "$a" in
        --yes|-y) YES=1 ;;
        --port=*) PORT="${a#*=}" ;;
        -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
        *) echo "unknown option: $a" >&2; exit 2 ;;
    esac
done
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "--port must be a number" >&2; exit 2; }

APPS_DIR="$ROOT/usr/share/mynode_apps"
SETTINGS="$ROOT/mnt/hdd/mynode/settings"
DATA="$ROOT/mnt/hdd/mynode/$APP"
ENV_FILE="$DATA/$APP.env"
UNIT="$ROOT/etc/systemd/system/$APP.service"
VERSION_FILE="$ROOT/home/bitcoin/.mynode/${APP}_version"
LOG_DIR="${TMPDIR:-/tmp}"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARNING:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
ask()  { [ "$YES" = 1 ] && return 0; read -r -p "$1 [y/N] " r; [[ "$r" =~ ^[Yy] ]]; }
rand() { python3 -c 'import secrets;print(secrets.token_hex(24))'; }
envget() { [ -f "$ENV_FILE" ] && sed -n "s/^$1=//p" "$ENV_FILE" | tail -1 || true; }

# ---------- 1. preflight ----------
[ "$SIM" = 1 ] || [ "$(id -u)" = 0 ] || die "run as root: sudo $0"
if [ "$SIM" != 1 ]; then
    [ -f /usr/share/mynode/mynode_device_info.sh ] || die "this does not look like a myNode (no /usr/share/mynode)"
    command -v mynode-manage-apps >/dev/null || die "mynode-manage-apps not found - update myNode first"
    command -v docker >/dev/null || die "docker not found - enable Docker on myNode first"
    [ -d /mnt/hdd/mynode ] || die "/mnt/hdd/mynode is missing (is the drive mounted?)"
    [ -s /mnt/hdd/mynode/settings/.btcrpcpw ] || die "myNode's Bitcoin RPC password file is missing (/mnt/hdd/mynode/settings/.btcrpcpw)"
    if ! systemctl is-enabled electrs >/dev/null 2>&1; then
        warn "Electrs is not enabled. Block Master needs it for address pages: enable it in the myNode UI (Electrum Server)."
    fi
    if command -v ss >/dev/null && ss -ltn "( sport = :$PORT )" | grep -q LISTEN && ! docker ps --format '{{.Names}}' | grep -q "^${APP}[-_]web"; then
        die "port $PORT is already in use - pick another with --port=N"
    fi
fi
ARCH="$(uname -m)"
case "$ARCH" in x86_64|aarch64) ;; *) die "unsupported CPU $ARCH (need x86_64 or aarch64)";; esac
IMG="$HERE/$APP/app_data/$APP-image-$ARCH.tar.gz"
[ -f "$IMG" ] || die "missing $IMG - this package was not built for $ARCH"
if [ -f "$IMG.sha256" ]; then (cd "$(dirname "$IMG")" && sha256sum -c --quiet "$(basename "$IMG").sha256") || die "image checksum mismatch"; fi
# myNode's loader runs str.replace() on these manifest fields: a null there makes `mynode-manage-apps init` skip the app.
LATEST="$(python3 - "$HERE/$APP/$APP.json" <<'PY'
import json, sys
try: a = json.load(open(sys.argv[1]))
except Exception as e: sys.exit(f"cannot parse {sys.argv[1]}: {e}")
bad = [k for k in ("short_name", "latest_version", "download_source_url") if k in a and not isinstance(a[k], str)]
bad += [f"download_binary_url.{k}" for k, v in (a.get("download_binary_url") or {}).items() if not isinstance(v, str)]
bad += ["app_page_content" for s in a.get("app_page_content", []) for l in s.get("content", []) if not isinstance(l, str)][:1]
if bad: sys.exit("fields that must be strings for myNode's app loader: " + ", ".join(bad))
if a.get("download_skip") is not True: sys.exit("download_skip must be true (the docker image ships in app_data)")
print(a["latest_version"])
PY
)" || die "app manifest $APP/$APP.json is not loadable by myNode - re-download the package"

cat <<MSG

Block Master $LATEST for myNode
  * A friendly block explorer that reads from your own Bitcoin Core (myNode's RPC user, like the built-in
    Mempool app) and Electrs. bitcoind's settings are not changed and it is not restarted.
  * Web UI on port $PORT (https on 4091). Data: ${DATA#$ROOT} (database + cache, about 1-3 GB over time).
  * Independent fork of The Mempool Open Source Project (AGPL-3.0), not affiliated with mempool.space.
MSG
ask "Continue?" || die "aborted"

# ---------- 2. app folder + registration ----------
say "Installing app definition to $APPS_DIR/$APP"
mkdir -p "$APPS_DIR"
rm -rf "${APPS_DIR:?}/$APP"
cp -r "$HERE/$APP" "$APPS_DIR/$APP"
chmod -R a+rX "$APPS_DIR/$APP"
# Runs myNode's app manager and stops on any error it reports for this app (it often exits 0 even then).
manage() {   # $1 = what (for messages), rest = mynode-manage-apps args
    local what="$1"; shift
    local log="$LOG_DIR/blockmaster-mynode-manage-apps-$1.log" rc=0
    "$MANAGE" "$@" 2>&1 | tee "$log" || rc=$?
    local errs; errs="$(awk -v app="$APP" '/Found Application: /{cur=$NF} /ERROR|FAILED|Traceback/ && (cur==app || index($0, app)) {print}' "$log")"
    if [ -n "$errs" ] || [ "$rc" != 0 ]; then
        printf '\n' >&2
        [ -n "$errs" ] && printf '%s\n' "$errs" >&2
        [ "$what" = init ] && rm -rf "${APPS_DIR:?}/$APP" && echo "Removed ${APPS_DIR#$ROOT}/$APP again." >&2
        die "myNode's app manager failed during '$what' (mynode-manage-apps $*, exit $rc). The app was not started.
       Full output: $log"
    fi
}
if [ "$USE_MANAGE" = 1 ]; then
    say "Registering the app with myNode (mynode-manage-apps init)"
    manage "init" init
    [ -f "$UNIT" ] || die "mynode-manage-apps init finished but did not install ${UNIT#$ROOT} - see $LOG_DIR/blockmaster-mynode-manage-apps-init.log"
    echo "OK: myNode loaded the app (${UNIT#$ROOT} installed)"
fi

# ---------- 3. app settings ----------
say "Writing $ENV_FILE"
mkdir -p "$DATA/cache" "$DATA/mysql" "$SETTINGS"
DB_PW="$(envget DB_PASSWORD)"; [ -n "$DB_PW" ] || DB_PW="$(rand)"
DB_ROOT_PW="$(envget DB_ROOT_PASSWORD)"; [ -n "$DB_ROOT_PW" ] || DB_ROOT_PW="$(rand)"
source "$HERE/$APP/app_data/images.env"
umask 077
cat > "$ENV_FILE" <<ENV
# Block Master settings (secrets - keep mode 600). Re-running install-mynode.sh keeps the database passwords.
# CORE_RPC_PASSWORD is refreshed from myNode's settings on every start (pre_blockmaster.sh).
BLOCKMASTER_PORT=$PORT
BLOCKMASTER_BIND=0.0.0.0
BLOCKMASTER_BACKEND_IMAGE=$BLOCKMASTER_BACKEND_IMAGE
BLOCKMASTER_DB_IMAGE=$BLOCKMASTER_DB_IMAGE
DB_PASSWORD=$DB_PW
DB_ROOT_PASSWORD=$DB_ROOT_PW
CORE_RPC_PASSWORD=$(cat "$SETTINGS/.btcrpcpw" 2>/dev/null || echo set-on-start)
ENV
umask 022
if id "$APP" >/dev/null 2>&1; then chown "$APP:$APP" "$DATA" "$ENV_FILE"; fi
[ "$SIM" = 1 ] || chown -R 1000:1000 "$DATA/cache" "$DATA/mysql"
chmod 700 "$DATA"; chmod 600 "$ENV_FILE"

# ---------- 4. install (loads + pulls the docker images) ----------
if [ "$USE_MANAGE" = 1 ]; then
    say "Installing app (loading and pulling docker images, this takes a few minutes)"
    if [ -f "$ROOT/mnt/hdd/mynode/settings/install_$APP" ] || [ -f "$ROOT/home/bitcoin/.mynode/install_$APP" ]; then
        manage "install" reinstall "$APP"
    else
        manage "install" install "$APP"
    fi
    GOT="$(cat "$VERSION_FILE" 2>/dev/null || echo missing)"
    [ "$GOT" = "$LATEST" ] || die "myNode's install step failed (${VERSION_FILE#$ROOT} = '$GOT', expected '$LATEST').
       Details: sudo journalctl -t mynode_manage_apps -n 100   and   $LOG_DIR/blockmaster-mynode-manage-apps-install.log"
    echo "OK: myNode installed $APP $GOT"
fi

# ---------- 5. enable + start ----------
if [ "$USE_MANAGE" = 1 ] && [ "$SIM" != 1 ]; then
    say "Enabling and starting $APP"
    systemctl cat "$APP.service" >/dev/null 2>&1 || die "$APP.service is not registered - re-run this installer and check its first error."
    systemctl daemon-reload
    systemctl enable "$APP" >/dev/null 2>&1 || true
    touch "/mnt/hdd/mynode/settings/${APP}_enabled"
    systemctl restart "$APP"
    printf 'Waiting for Block Master on port %s' "$PORT"
    for _ in $(seq 1 100); do curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break; printf .; sleep 3; done; echo
    if curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then echo "OK: Block Master is up"
    else warn "not answering yet (the database starts first). Check: sudo systemctl status $APP   and   sudo journalctl -u $APP -n 50"; fi
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
cat <<DONE

Done.
  Open:   http://mynode.local:$PORT   (or http://${IP:-<mynode-ip>}:$PORT, or https://mynode.local:4091)
  The first minutes after install the backend indexes recent blocks; the dashboard fills in as it goes.
DONE
exit 0
