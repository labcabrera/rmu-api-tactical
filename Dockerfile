# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24-bookworm-slim

# pnpm comes from corepack, pinned by the packageManager field of package.json
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack install

# Build on the builder's platform (fast in multi-platform buildx builds)
FROM base AS build
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store
COPY tsconfig*.json nest-cli.json .swcrc ./
COPY src ./src
RUN pnpm run build

# Production dependencies, also on the builder's platform (no emulation needed): supportedArchitectures
# makes pnpm pick the optional platform binaries of the target. Install scripts are skipped, so nothing
# is compiled. --config.package-import-method=copy keeps the files real (no hard links into the cache).
FROM base AS deps
ARG TARGETARCH
RUN printf 'supportedArchitectures:\n  os: [linux]\n  cpu: [%s]\n  libc: [glibc]\n' \
    "$([ "$TARGETARCH" = amd64 ] && echo x64 || echo "$TARGETARCH")" > pnpm-workspace.yaml
RUN --mount=type=cache,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod --ignore-scripts --store-dir /pnpm/store --config.package-import-method=copy

FROM ${NODE_IMAGE} AS production
ENV NODE_ENV=production PORT=3003
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3003
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch(`http://localhost:${process.env.PORT}/v1/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "--enable-source-maps", "dist/main.js"]
