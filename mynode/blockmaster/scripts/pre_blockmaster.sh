#!/bin/bash
# Runs as ROOT before every start: refreshes myNode's RPC password in blockmaster.env and prepares the data folders.
DATA=/mnt/hdd/mynode/blockmaster
ENV_FILE="$DATA/blockmaster.env"
mkdir -p "$DATA/cache" "$DATA/mysql"
# the backend and MariaDB containers run as uid/gid 1000 (as upstream mempool does)
chown -R 1000:1000 "$DATA/cache" "$DATA/mysql"
chmod 750 "$DATA/cache" "$DATA/mysql"
if [ ! -f "$ENV_FILE" ]; then
    echo "pre_blockmaster: $ENV_FILE is missing - run install-mynode.sh" >&2
    exit 1
fi
if [ -s /mnt/hdd/mynode/settings/.btcrpcpw ]; then
    PW="$(cat /mnt/hdd/mynode/settings/.btcrpcpw)"
    TMP="$(mktemp "$DATA/.env.XXXXXX")"
    grep -v '^CORE_RPC_PASSWORD=' "$ENV_FILE" > "$TMP" || true
    echo "CORE_RPC_PASSWORD=$PW" >> "$TMP"
    mv "$TMP" "$ENV_FILE"
fi
# keep the pinned images in sync with this app version (upgrades ship a new images.env)
IMAGES=/opt/mynode/blockmaster/app_data/images.env
if [ -f "$IMAGES" ]; then
    TMP="$(mktemp "$DATA/.env.XXXXXX")"
    grep -vE '^BLOCKMASTER_(BACKEND|DB)_IMAGE=' "$ENV_FILE" > "$TMP" || true
    grep -E '^BLOCKMASTER_(BACKEND|DB)_IMAGE=' "$IMAGES" >> "$TMP"
    mv "$TMP" "$ENV_FILE"
fi
chown blockmaster:blockmaster "$DATA" "$ENV_FILE"
chmod 700 "$DATA"; chmod 600 "$ENV_FILE"
