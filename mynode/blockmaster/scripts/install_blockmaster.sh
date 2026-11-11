#!/bin/bash
# Runs as the "blockmaster" user inside /opt/mynode/blockmaster (app_data/ already copied there by mynode-manage-apps).
source /usr/share/mynode/mynode_device_info.sh
source /usr/share/mynode/mynode_app_versions.sh
source /usr/share/mynode/mynode_functions.sh

set -x
set -e

echo "==================== INSTALLING APP ===================="
ARCH=$(uname -m)                       # aarch64 (Raspberry Pi / RockPro64) or x86_64
IMG_TAR="app_data/blockmaster-image-${ARCH}.tar.gz"
VERSION_TAG="${VERSION:-v1.1.0}"
source app_data/images.env

# The Block Master web image ships inside the app package (built by scripts/package-mynode.sh).
if [ ! -f "$IMG_TAR" ]; then
    echo "Missing $IMG_TAR - rebuild the package for $ARCH (scripts/package-mynode.sh)"; exit 1
fi
if [ -f "$IMG_TAR.sha256" ]; then
    (cd app_data && sha256sum -c "$(basename "$IMG_TAR").sha256")
fi
remove_docker_images_by_name 'blockmaster/frontend' || true
LOADED=$(docker load -i "$IMG_TAR" | sed -n 's/^Loaded image: //p' | tail -1)
[ -n "$LOADED" ] || { echo "docker load did not report an image"; exit 1; }
docker tag "$LOADED" blockmaster/frontend:latest
docker tag "$LOADED" "blockmaster/frontend:${VERSION_TAG#v}"

# Unmodified upstream backend + MariaDB, pulled by digest.
docker pull "$BLOCKMASTER_BACKEND_IMAGE"
docker pull "$BLOCKMASTER_DB_IMAGE"
echo "================== DONE INSTALLING APP ================="
