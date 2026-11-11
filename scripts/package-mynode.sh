#!/bin/bash
# Build the myNode package: per-arch Block Master web images saved into mynode/blockmaster/app_data/, then one tarball in build/.
#   scripts/package-mynode.sh            # amd64 + arm64 (arm64 via buildx + QEMU binfmt)
#   ARCHS="amd64" scripts/package-mynode.sh
# Needs docker with buildx. For arm64 on an x86 box register QEMU first, e.g.
#   docker run --privileged --rm tonistiigi/binfmt --install arm64
# The frontend build itself is architecture independent and runs natively (Dockerfile uses --platform=$BUILDPLATFORM).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(python3 -c 'import json;print(json.load(open("mynode/blockmaster/blockmaster.json"))["latest_version"].lstrip("v"))')"
ARCHS="${ARCHS:-amd64 arm64}"
DOCKER="${DOCKER:-docker}"
APPDIR=mynode/blockmaster
OUT="build/blockmaster-mynode-v$VERSION"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
rm -f "$APPDIR"/app_data/blockmaster-image-*.tar.gz*
for a in $ARCHS; do
    case "$a" in amd64) m=x86_64 ;; arm64) m=aarch64 ;; *) echo "bad arch $a" >&2; exit 2 ;; esac
    tag="blockmaster/frontend:$VERSION-$a"
    echo "== building $tag"
    $DOCKER buildx build --platform "linux/$a" --build-arg commitHash="$COMMIT" --load -t "$tag" .
    echo "== saving $APPDIR/app_data/blockmaster-image-$m.tar.gz"
    $DOCKER save "$tag" | gzip -6 > "$APPDIR/app_data/blockmaster-image-$m.tar.gz"
    (cd "$APPDIR/app_data" && sha256sum "blockmaster-image-$m.tar.gz" > "blockmaster-image-$m.tar.gz.sha256")
done
rm -rf "$OUT"; mkdir -p "$OUT/docs"
cp -r "$APPDIR" "$OUT/blockmaster"
cp mynode/install-mynode.sh mynode/uninstall-mynode.sh "$OUT/"
cp docs/mynode-install.md "$OUT/docs/"
cp docker-compose.yml .env.example LICENSE "$OUT/"
(cd build && tar czf "blockmaster-mynode-v$VERSION.tar.gz" "blockmaster-mynode-v$VERSION" && sha256sum "blockmaster-mynode-v$VERSION.tar.gz" > "blockmaster-mynode-v$VERSION.tar.gz.sha256")
ls -lh build/*.tar.gz; cat build/*.sha256
