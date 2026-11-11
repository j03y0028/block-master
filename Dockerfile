# syntax=docker/dockerfile:1
# Block Master web image (amd64 + arm64): the rebranded Angular frontend served by nginx, which also proxies /api to
# the mempool backend container. The backend itself is the unmodified upstream mempool backend (see docker-compose.yml).
# Build:  docker build -t blockmaster/frontend:1.1.0 .
#         docker buildx build --platform linux/amd64,linux/arm64 -t blockmaster/frontend:1.1.0 .

ARG NODE_IMAGE=node:24.13-bookworm-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2
ARG NGINX_IMAGE=nginx:1.27.0-alpine@sha256:208b70eefac13ee9be00e486f79c695b15cef861c680527171a27d253d834be9

# ---- 1. frontend production build (architecture independent, so it runs once on the build platform) ----
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
ARG commitHash
ENV DOCKER_COMMIT_HASH=${commitHash} \
    CYPRESS_INSTALL_BINARY=0 \
    NG_CLI_ANALYTICS=false
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=optional --no-audit --no-fund
COPY frontend/ ./
COPY docker/frontend/entrypoint.sh docker/frontend/wait-for ./
COPY nginx.conf nginx-mempool.conf ./
# same nginx templating as upstream docker/init.sh
RUN set -eu; \
    sed -i -e "s/127.0.0.1:80/0.0.0.0:__MEMPOOL_FRONTEND_HTTP_PORT__/g" -e "s/127.0.0.1/0.0.0.0/g" -e "s/user nobody;//g" \
           -e "s!/etc/nginx/nginx-mempool.conf!/etc/nginx/conf.d/nginx-mempool.conf!g" nginx.conf; \
    sed -i -e "s/127.0.0.1:8999/__MEMPOOL_BACKEND_MAINNET_HTTP_HOST__:__MEMPOOL_BACKEND_MAINNET_HTTP_PORT__/g" nginx-mempool.conf; \
    cp mempool-frontend-config.sample.json mempool-frontend-config.json; \
    npm run build

# ---- 2. runtime ----
FROM ${NGINX_IMAGE}
LABEL org.opencontainers.image.title="Block Master" \
      org.opencontainers.image.description="Friendly, holiday-themed Bitcoin explorer for your own node (fork of The Mempool Open Source Project)" \
      org.opencontainers.image.source="https://github.com/j03y0028/block-master" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.version="1.1.0"
WORKDIR /patch
COPY --from=build /build/entrypoint.sh /build/wait-for ./
COPY --from=build /build/dist/mempool /var/www/mempool
COPY --from=build /build/nginx.conf /etc/nginx/
COPY --from=build /build/nginx-mempool.conf /etc/nginx/conf.d/
RUN chmod +x /patch/entrypoint.sh /patch/wait-for \
 && chown -R 1000:1000 /patch /var/cache/nginx /var/log/nginx /etc/nginx/nginx.conf /etc/nginx/conf.d /var/www/mempool \
 && chmod -R 755 /patch \
 && touch /var/run/nginx.pid && chown 1000:1000 /var/run/nginx.pid
USER 1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:${FRONTEND_HTTP_PORT:-8080}/ || exit 1
ENTRYPOINT ["/patch/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
