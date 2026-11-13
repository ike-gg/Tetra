# Build context: repository root.
FROM oven/bun:1.3.8-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg gifsicle \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/core/package.json apps/core/
COPY apps/web/package.json apps/web/
# Install scripts are skipped: gifsicle tries to compile itself on linux/arm64.
# Only sharp needs its script (downloads libvips); gifsicle uses the system binary.
RUN bun install --frozen-lockfile --production --filter @tetra/core --ignore-scripts
RUN cd node_modules/sharp && bun run install
RUN find node_modules -path "*/gifsicle/package.json" -exec dirname {} \; \
  | xargs -I{} sh -c 'mkdir -p {}/vendor && ln -sf /usr/bin/gifsicle {}/vendor/gifsicle'

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY tsconfig.base.json ./
COPY apps/core apps/core

WORKDIR /app/apps/core
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]
