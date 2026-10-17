# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

# ---- build the React app ---------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The build context is this folder, so ../PRIVACY_NOTICE.md is not visible here and the
# committed web/src/privacy-notice.md is used (a test keeps it in sync with the source).
RUN npm run build && npm prune --omit=dev && rm -f server/*.test.js

# ---- runtime ----------------------------------------------------------------
FROM litestream/litestream:0.3.13 AS litestream

FROM node:${NODE_VERSION}-slim
# Litestream is written in Go and reads the system certificate store, which the slim image lacks.
# (Node uses its own bundled certificates, which is why only the backup would have broken.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream

WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/platform.db
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
# server/notice.js reads this at runtime to fingerprint the privacy notice.
COPY --from=build /app/web/src/privacy-notice.md ./web/src/privacy-notice.md
COPY litestream.yml /etc/litestream.yml
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
