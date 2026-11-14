# Tetra core

The Discord bot and the REST API for the panel (`apps/core`). Paths in this document are relative to `apps/core`; commands are run from the repo root.

**Stack:** Bun (runtime, `bun run`, `Bun.spawn`), TypeScript (strict), discord.js 14 with sharding, Express 5 (API), Drizzle + PostgreSQL, Redis (ioredis), sharp + gifsicle (images), ffmpeg + Cobalt (`/media`), Zod (validation everywhere).

## Architecture

Two kinds of processes:

- **Manager process** (`src/index.ts`): startup only (temp cleanup in production, continuity cleanup, the **Express API** when `API_ENABLED`, shard spawn and shutdown hooks). It exports nothing. `shardingManager` and `discordOauth` live in `src/lib/sharding-manager` and `src/lib/discord-oauth`; the API imports them from there.
- **Shard processes** (`src/bot.ts`): discord.js client, events, interactions. Exports `internalClient`. Spawned by `ShardingManager` as child processes (mode `process`, `respawn: true`).

⚠️ Never import `@/bot` from API code (manager process): importing it creates a client and **logs in with the bot token**. To talk to Discord from the API use `discordRestApi` (`src/lib/discord-rest-api`) or `shardingManager.broadcastEval`. The same applies to tests and tools: loading interaction modules can pull in `@/bot` (some button handlers import it), so stub `@/bot` in such tests.

### Process lifecycle

- The manager kills its shards on SIGINT/SIGTERM/exit and disables respawn during shutdown.
- In development a shard exits by itself when its manager is gone (IPC `disconnect`, plus a `process.connected` watchdog); see `src/lib/shards/exit-when-manager-is-gone.ts`. In production this is off: manager and shards run in one container and die together.
- Without these, shards outlive the manager as orphans, each logged into Discord with the same token and running old code (duplicate event handling). Check with `pgrep -fl src/bot.ts`.

### Directories

| Path | Contents |
|---|---|
| `src/interactions/commands/{global,internal}/…` | Slash/context commands. **Loaded automatically** from the directory (`InteractionsFileManager`). The file must `export default` a handler instance. `internal` is dev-only. |
| `src/interactions/buttons/{generic,global}`, `select-menu/global` | Buttons and select menus. `global` = "continuity" (see below). Also auto-loaded, so "no importers" does not mean unused. |
| `src/interactions/subcommands` | `/addemote` subcommand logic. |
| `src/emotes/` | Emote flow: `prepare-emote` → `edit-emote-by-user` → `add-emote-to-guild`; sources in `source/{7tv,bttv,ffz,file}`. |
| `src/lib/buffer/` | Optimization pipeline (sharp + gifsicle). |
| `src/lib/media/` | Platform handlers for `/media`. |
| `src/lib/network/` | `url-guard.ts`: SSRF protection for server-side downloads. |
| `src/lib/crypto/` | Encryption of Discord OAuth tokens at rest. |
| `src/lib/discord-oauth`, `src/lib/sharding-manager`, `src/lib/shards` | Manager-side singletons and shard lifecycle helpers. |
| `src/services/` | `ProcessingEmoteService` (state of the emote being added), `EmoteStorageService` (search results, pagination). |
| `src/components/` | Functions returning `BaseMessageOptions` (embeds + buttons). |
| `src/api/` | REST API for the panel: `routes/{auth,me,guilds,tasks}`, `middleware/` (auth, rate limit), session cleanup. |
| `src/db/schemas/` | Drizzle schema (no migrations in the repo, `db:push` is used). |
| `src/helpers/` | Loggers (`#/loggers`), temp files, interaction loader. |
| `src/utils/` | Misc helpers; `managers/feedback-manager.ts` = replies to the user. |

### Mechanisms worth knowing

- **Continuity**: a "global" button stores its data in the `continuity` table (Postgres) and its `customId` is `name:uuid`. The handler receives Zod-validated `data`. New button = class extending `BaseContinuity` + `Continuity.create(data)` when rendering. Rows older than 24 h are deleted by the manager (at start, then hourly); a button whose row is gone answers "Interaction expired". Buttons need their row for at most ~6 h (longest-lived state is the 6 h search storage).
- **ProcessingEmoteService**: state of the emote being added lives in Redis with a 15-min TTL, re-armed on every write (reads don't extend it). Its files live in one temp dir per processing key (`tetra-keep-<key>`), removed by a sweeper once the Redis key is gone. `store()` normalizes the file (animated WebP → GIF, animation detected from the file). Always go through this service, never through the files directly.
- **TempFileManager**: `create()` = `tetra-tmp-*` dir for a one-off operation, removed after 15 min; `createPersistent(key)` = `tetra-keep-*` dir tied to a Redis key. Only `tetra-` prefixed dirs are ever deleted, because `TEMP_DIR_PATH` may be the system tmp dir.
- **EmoteStorageService**: search results for pagination, in Redis for 6 h.
- **Optimization**: single entry point `optimizeBuffer` (`src/lib/buffer/optimize-buffer.ts`), used by both the bot (via the `emoteOptimize` wrapper) and the API. Animations: resize to 128 px → ladder of gifsicle presets (binary search). Dropping frames preserves the total delay. It runs in-process, so heavy work in the API blocks the manager.
- **Editor tasks**: "Open in editor" in the bot creates an `editor_tasks` row (+ an `emotes` row with the source file URL); the panel edits the source file in the browser and submits a data URL. Deleting/submitting a task also removes its `emotes` row if nothing else references it. The browser side is the web editor, see [web/editor.md](web/editor.md#panel-integration-later).
- **Removed emotes**: the panel deletes an emote by inserting `emotes` + `removed_emotes` rows (in a transaction) *before* the Discord delete, and removes them again if Discord refuses. The shard's `emojiDelete` event then finds that row and skips; deletions done in Discord itself are recorded by the event with `deletedWithPanel: false`. Restore re-uploads the image from the Discord CDN.
- **User-facing errors**: throw `EmbeddedError` (`src/constants/errors.ts`), catch it in the handler and pass to `feedback.handleError(error)`. Unknown errors get a tracking ID and are logged.
- **Interaction log**: `interactions` table, id stored as exact `bigint` (snowflakes exceed `Number.MAX_SAFE_INTEGER`), `input` as a plain JSON object.
- **Loggers**: `CoreConsole` / `BotConsole` / `ApiConsole` from `#/loggers`; `.dev.*` logs only in development.

## API

- Base path `/api`. Error format everywhere: `{ error: string, reference?: string }` (`reference` = machine code or a hex trace id for 500s). Unexpected errors and body-parser errors go through the same handler (`apiErrorHandler`).
- **Auth**: Discord OAuth with a random `state` stored in the session cookie. Cookie `tetra-session` (cookie-session): `httpOnly`, `sameSite: lax`, `secure` in production, unsigned on purpose (it only holds a random 256-bit token checked against the DB), optional `COOKIE_DOMAIN`. `sameSite: lax` requires the panel and the API to be on the same site (same registrable domain; any port on localhost).
- **Sessions**: 30 days sliding. `sessions.last_used_at` is updated at most once per hour per session, which also re-sends the cookie; idle > 30 days → `401 SESSION_EXPIRED`. Expired rows are deleted hourly by the manager.
- **Rate limiting** (in-memory, per IP): ~120 req/min for `/api`, ~10/min for `/api/auth`; `429 RATE_LIMITED` with `Retry-After`. Relies on `trust proxy = 1` in production (exactly one proxy hop); with more hops all clients share one IP.
- **CORS**: origins from `CORS_ORIGINS` (comma-separated), default = `FRONTEND_URL` origin.
- **JSON body limit**: 2 MB (editor submits emotes as base64 data URLs; other payloads too). Don't lower it.
- **Discord tokens** (`users.access_token`, `refresh_token`) are encrypted with AES-256-GCM (`v1:<iv>:<tag>:<ciphertext>`) using `TOKEN_ENCRYPTION_KEY`. Values without `v1:` are legacy plaintext and get re-encrypted on the next write. Losing or changing the key logs everyone out.
- Guild access checks: the user must be in the guild (OAuth guild list) and have `ManageGuildExpressions` for write endpoints.

## Security rules

- Every server-side download of a user-supplied URL goes through `src/lib/network/url-guard.ts` (`safeFetch`): private/loopback/link-local/metadata IPs blocked, each redirect hop re-checked. `POST /guilds/:id/emote` additionally requires https and an allow-listed host (7TV, BTTV, FFZ, Twitch, Discord CDN, Tenor, Giphy, Imgur).
- Records loaded by id must be checked against the guild/user in the URL (no cross-guild/cross-user access).
- Never log tokens, session values or keys.

## Discord platform facts (verified)

- An emoji id belongs to exactly one guild and can be deleted only once; re-adding or restoring creates a new id.
- Deleting an emoji through the REST API (e.g. from the panel) also fires the gateway `emojiDelete` event in the shard (intent `GuildExpressions`).
- Emoji slots per type (static and animated separately): 50 / 100 / 150 / 250 by boost tier. Managed emojis (Twitch integration) are not counted as slots in Tetra (bot and API count the same way).
- discord.js `GuildEmoji.deletable` also depends on the bot's own `ManageGuildExpressions` permission; don't use it to count slots.
- Upload limits change over time (free 20 MB since Aug 2026, boost level 2 = 50 MB, level 3 = 100 MB, paid perks up to 250 MB). Don't hardcode them: use `interaction.attachmentSizeLimit` (Discord's `attachment_size_limit`, per attachment).
- Discord only accepts clicks on components that exist on the message, so a button `customId` is always one the bot produced (possibly from an old version).
- Deleted emoji images usually stay on the Discord CDN for a while, but this is not guaranteed.

## External emote APIs

- **7TV**: v3 GraphQL (`7tv.io/v3/gql`) and REST (`/v3/emotes/:id`, `/v3/users/twitch/:id`). Send user text as GraphQL **variables**, never interpolated. v3 is legacy; v4 lives at `api.7tv.app/v4/gql` with a different schema (e.g. `search` requires `sort`). 7TV has short outages; search retries transient failures only.
- **BTTV**: as of 2026-11 the `/3/cached/*` endpoints and the CDN work, but `/3/emotes/{id}` and `/3/emotes/shared/*` return `403 unauthorized` without auth.
- **FFZ**: public REST API, works without auth.
- Twitch emotes come from the Twitch Helix API (`@twurple`, app token from `TWITCH_CLIENT_ID`/`TWITCH_SECRET_KEY`).

## Bun runtime facts (verified on Bun 1.3.8)

- A forked child is **not** stopped when its parent dies (SIGTERM, SIGKILL or crash); it receives `process.on("disconnect")` and `process.connected` becomes false, but only if something listens on the IPC channel.
- `process.ppid` is not updated after the parent dies.
- `bun --watch` restarts the process in place (same PID) without running exit/signal handlers.
- Native `fetch` is used everywhere (no `node-fetch`).

## Database

- Schema in `src/db/schemas/`, applied with `bun run db:push` (no migration files). `db:push` can propose destructive changes (e.g. truncating a table): read its output, abort anything that isn't additive, and run it on production yourself.
- `emotes.external_id` is not unique (several rows can share a source/Discord id).
- Drizzle `relations()` are code only; changing them doesn't change the DB.

## Environment variables

Validated in `src/env.ts` (Zod + a readable error table); the app doesn't start if a required one is missing.

- **Required**: `DISCORD_BOT_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `POSTGRES_URL`, `REDIS_URL`, `BACKEND_URL`, `FRONTEND_URL`, `SESSION_KEYS`, `TOKEN_ENCRYPTION_KEY` (32 bytes base64/hex, e.g. `openssl rand -base64 32`), `INVITE_LINK`, `TWITCH_CLIENT_ID`, `TWITCH_SECRET_KEY`, `TENOR_API_KEY`, `IMGUR_CLIENT_ID` (also when the API is disabled).
- **Optional**: `ENV` (`production` enables trust proxy, secure cookies, temp cleanup at start and disables the dev shard watchdog; default development), `PORT` (3002), `API_ENABLED`, `CORS_ORIGINS`, `COOKIE_DOMAIN`, `TEMP_DIR_PATH` (default system tmp), `DEV_GUILDS`, `ERROR_LOG_CHANNEL_ID`, `COBALT_URL`, `COBALT_API_KEY`.

## Conventions (core)

- File names: kebab-case. Exception: API routes `guilds.get-guild.ts` (`resource.action`). Components: `*.component.ts`, services: `*.service.ts`.
- Aliases: `@/*` → `src/*`, `#/*` → `src/helpers/*`. New code uses aliases instead of `../../..`.
- User-facing strings: shared ones live in `src/constants/messages.ts`.
- Background timers (cleanups, sweepers) run in the manager only and are `unref()`ed.

## Scripts

Run inside `apps/core`, or from the root with `bun --filter @tetra/core <script>`.

- `dev` – watch, `start` – production
- `deploy:dev` – register commands on `DEV_GUILDS`; `deployCommands` – globally
- `db:push` / `db:studio` – Drizzle (also available from the root)
- `typecheck` – `tsc --noEmit`

## Docker

- Image: `docker/core.Dockerfile`, built from the **repo root** (it needs the root `bun.lock` and `tsconfig.base.json`). Base `oven/bun` (Debian slim) with `ffmpeg` and `gifsicle` from apt.
- `bun install` runs with `--ignore-scripts`: the `gifsicle` npm package has no linux/arm64 binary and its postinstall tries to compile from source. Only sharp's install script is run (downloads libvips), and the npm gifsicle path is symlinked to `/usr/bin/gifsicle`. A new dependency that needs an install script must be run explicitly in the Dockerfile.
- Manager, API and all shards run in one container.

## Agent pitfalls (core)

- New command/button = new file in the right directory with `export default`. No manual registration, but slash commands must be deployed (`deploy:dev`).
- Always work with an emote through `ProcessingEmoteService`, never directly through files.
- `emote.animated` is determined from the file in `store()`. Don't trust flags from sources.
- Change optimization only in `src/lib/buffer/` and verify on real GIFs (size, dimensions, frame count, total delay).
- API code runs in the manager process, bot code in the shards. See the `@/bot` warning above.
- A running `dev` picks up every file change immediately, including uncommitted edits, and executes it against the real bot token and the local DB. Don't keep it running while code is being changed, and check for orphaned shards afterwards (`pgrep -fl src/bot.ts`).
- Don't start the bot (or load modules that import `@/bot`) in tests unless asked; the token in `.env` may be the production one.
- Verify assumptions about Discord and the emote APIs against their docs or live responses before changing code.
