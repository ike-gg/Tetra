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

# yt-dlp solves YouTube's JS challenges with an external runtime; deno is its default
# (bun support is deprecated). Official single-binary image, multi-arch, latest release.
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

# /media downloaders, unpinned on purpose: platforms break old versions within weeks.
# ADD re-downloads the PyPI metadata on every build, so a new release busts this layer.
ADD https://pypi.org/pypi/yt-dlp/json /tmp/versions/yt-dlp.json
ADD https://pypi.org/pypi/gallery-dl/json /tmp/versions/gallery-dl.json
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/media-tools \
  && /opt/media-tools/bin/pip install --no-cache-dir --upgrade "yt-dlp[default,curl-cffi]" gallery-dl \
  && ln -s /opt/media-tools/bin/yt-dlp /opt/media-tools/bin/gallery-dl /usr/local/bin/ \
  && rm -rf /tmp/versions \
  && /opt/media-tools/bin/python -c "import yt_dlp_ejs" \
  && yt-dlp --version && gallery-dl --version && deno --version

COPY --from=deps /app/node_modules node_modules
COPY tsconfig.base.json ./
COPY apps/core apps/core

WORKDIR /app/apps/core
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]
