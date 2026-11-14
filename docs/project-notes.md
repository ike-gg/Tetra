# Tetra – project notes

Project description and lasting knowledge for people and agents working on this repo. No tasks or bug lists here.

- [core.md](core.md) – Discord bot + REST API (`apps/core`)
- [web.md](web.md) – website and panel (`apps/web`)
- [branding.md](branding.md) – visual and verbal identity (rendered at `/branding`, logo at `/logo`)

## What Tetra is

A Discord bot for managing emotes. Main feature: adding an emote from 7TV / BTTV / FFZ / a link / a message with **automatic optimization** to fit Discord's 256 KB emoji limit. The bot also has `/media` (download media from social posts via Cobalt). A web panel extends it: managing server emotes, restoring removed ones, editing emotes in the browser. The website also has a public editor (`/editor`, no account) that crops, trims, resizes and compresses GIFs and images entirely in the browser; the panel will reuse it (see [web/editor.md](web/editor.md)).

## Monorepo

Bun workspaces, one `bun.lock` in the root.

| Path | Contents |
|---|---|
| `apps/core` | `@tetra/core`: Discord bot (sharded) + REST API for the panel. One deployable process tree. |
| `apps/web` | `@tetra/web`: TanStack Start app. Static homepage + client-only panel. |
| `CLAUDE.md` | Entry point for agents: links to the docs below and the rules that apply everywhere. |
| `.claude/agents/` | Project subagents `core` and `web`, one per app. They read the docs at the start of each task instead of copying them, so keep rules in `docs/`, not in the agent files. |
| `.claude/skills/`, `skills-lock.json` | Project agent skills, installed with the `skills` CLI (`npx skills add <repo> --skill <name> --agent claude-code`, update with `npx skills update`). Copies are committed; the lock file records their source and hash. |
| `docs/` | Project documentation (this file, `core.md`, `web.md`, topic docs in `docs/web/`). |
| `docker/` | Dockerfiles, always built with the repo root as context. |
| `docker-compose.yml` | Local Postgres + Redis; `core` under the `full` profile. |
| `tsconfig.base.json`, `biome.json` | Shared TypeScript and Biome config. |

Shared code goes to `packages/*` once there is any (nothing yet). Package names use the `@tetra/` scope.

## Local development

1. `bun install` in the root.
2. `apps/core/.env` from `apps/core/.env.example` (see [core.md](core.md#environment-variables)).
3. `bun db:up` – Postgres and Redis in Docker (`tetra`/`tetra`, db `tetra`, ports 5432/6379; override with `POSTGRES_PORT`/`REDIS_PORT`).
4. `bun db:push` – create the tables.
5. `bun dev` – core and web together (web on `http://localhost:3000`, API on `http://localhost:3002`).

`docker compose --profile full up --build` runs core in its production image against the compose databases (it reads `apps/core/.env`, `POSTGRES_URL`/`REDIS_URL` are overridden to the compose services).

## Scripts (root)

- `bun dev` – core and web side by side through `concurrently` (prefixed logs; when one exits, the other is stopped too); `bun dev:core`, `bun dev:web` – one app. Not `bun --filter '@tetra/*' dev`: `--filter` runs scripts in dependency order, and web depends on `@tetra/core` (for the API types), so web would wait forever for core's never-ending `--watch`.
- `bun build:web` – production build of the web app
- `bun db:up` / `bun db:down` – compose Postgres + Redis
- `bun db:push` / `bun db:studio` – Drizzle (core)
- `bun check` – Biome lint + format + imports (`check:fix` applies fixes), `bun lint`, `bun format`
- `bun typecheck` – type-checks every app (core: `tsc --noEmit`, web: `tsc -b`, which also checks the API types web uses). Biome doesn't type-check; both must pass.
- No tests yet.

App-specific scripts: `bun --filter @tetra/<app> <script>`.

## Deployment

Coolify.

One Coolify resource, Docker Compose build pack: `docker-compose.prod.yml` at the repo root (local dev keeps using `docker-compose.yml`). Services:

- **postgres**, **redis**: no published ports, data in named volumes. The Postgres password is Coolify's generated `SERVICE_PASSWORD_POSTGRES`; core's `POSTGRES_URL` / `REDIS_URL` are built in the compose file from the service names.
- **core**: `docker/core.Dockerfile`, port 3002 (domain e.g. `api.tetra.lol`). `ENV=production` and `API_ENABLED=true` (core's default is `false`) are set in the compose file; every other var comes from Coolify's env list (the compose file names them, `${VAR:?}` = required). Unset optional vars arrive as empty strings, which `env.ts` treats as unset.
- **web**: `docker/web.Dockerfile` builds the site (Node runs Vite, Bun installs and runs `build:seo`) and serves `dist/client` with Caddy on port 80 (`docker/web.Caddyfile`): `/invite` redirects (302) to `INVITE_LINK` (the same env var as core, passed to web at runtime); under `/panel` and `/editor/*` a file, else `<path>/index.html`, else `_shell.html` (client-only routes); anywhere else a file or `<path>/index.html`, otherwise `404.html` with status 404. `/assets/*` is cached as immutable. `VITE_API_URL` (required) and `VITE_SITE_URL` are **build** args: mark them as build variables in Coolify.
- **Schema**: no migrations and `drizzle-kit` isn't in the core image, so run `bun run db:push` from a machine with `POSTGRES_URL` pointed at production (SSH tunnel) after a schema change.
- Discord OAuth redirect: `<BACKEND_URL>/api/auth/callback` must be listed in the Developer Portal.
- Only one bot instance may run per token: stop any old deployment before the first start.

## Conventions

- Everything in the repo is in **English**: code, comments, docs, commit messages.
- File and directory names: **kebab-case** (`get-emote-from-url.ts`). App-specific exceptions are in the app docs.
- Aliases: `@/*` → the app's `src/*` (core also has `#/*` → `src/helpers/*`). Node built-ins as `node:*`.
- Formatting, import order and linting: **Biome** (root `biome.json`), no Prettier/ESLint. Import groups: external → `@/` → relative → `#/`, `lineWidth: 90`. Type-aware promise rules (`noFloatingPromises`, `noMisusedPromises`) are on: await promises or mark fire-and-forget with `void`.
- Comments: **sparse**, only where they explain "why".
- Validate external input/data with Zod.
