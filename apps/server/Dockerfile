# Build context is the repo root (see docker-compose.yml).
# Based on https://bun.sh/guides/ecosystem/docker, adapted for the Bun workspace.
FROM oven/bun:1.4 AS base
WORKDIR /usr/src/app

# Install only the server's production deps. Every workspace manifest is copied
# because bun.lock references all of them.
FROM base AS install
COPY package.json bun.lock bunfig.toml ./
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
RUN bun install --frozen-lockfile --production --filter @ext2/server

FROM base AS release
ENV NODE_ENV=production
COPY --from=install /usr/src/app/node_modules node_modules
COPY apps/server apps/server
WORKDIR /usr/src/app/apps/server

USER bun
EXPOSE 3000/tcp
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/index.ts"]
