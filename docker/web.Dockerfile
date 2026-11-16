# Build context: repository root.
# Vite runs on Node: under Bun its prerender step couldn't reach its own preview server
FROM node:22-slim AS build
COPY --from=oven/bun:1.3.8-slim /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/core/package.json apps/core/
COPY apps/web/package.json apps/web/
# Install scripts skipped: core's gifsicle tries to compile itself; web needs none
RUN bun install --frozen-lockfile --filter @tetra/web --ignore-scripts

# Vite inlines VITE_* at build time, so they are build args, not runtime env
ARG VITE_API_URL
ARG VITE_SITE_URL=https://tetra.lol
# Optional: empty builds a site without Google Analytics
ARG VITE_GA_MEASUREMENT_ID=
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

# Core sources only for the type-only `@tetra/core/api` import; nothing from core is bundled
COPY apps/core apps/core
COPY apps/web apps/web
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" && exit 1)
RUN cd apps/web && bun run build

FROM caddy:2.10-alpine
COPY docker/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist/client /srv
EXPOSE 80
