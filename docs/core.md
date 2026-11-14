# Tetra core

The Discord bot and the REST API for the panel (`apps/core`). Paths in this document are relative to `apps/core`; commands are run from the repo root.

**Stack:** Bun (runtime, `bun run`, `Bun.spawn`), TypeScript (strict), discord.js 14 with sharding, Hono (API, served by `Bun.serve`), Drizzle + PostgreSQL, Redis (ioredis), sharp + gifsicle (images), ffmpeg + Cobalt (`/media`), Zod (validation everywhere).

## Architecture

Two kinds of processes:

- **Manager process** (`src/index.ts`): startup only (temp cleanup in production, continuity cleanup, the **Hono API** when `API_ENABLED`, shard spawn and shutdown hooks). It exports nothing. `shardingManager` and `discordOauth` live in `src/lib/sharding-manager` and `src/lib/discord-oauth`; the API imports them from there.
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
| `src/api/` | REST API for the panel, see [API](#api). |
| `src/db/schemas/` | Drizzle schema (no migrations in the repo, `db:push` is used). |
| `src/helpers/` | Loggers (`#/loggers`), temp files, interaction loader. |
| `src/utils/` | Misc helpers; `managers/feedback-manager.ts` = replies to the user. |

### Mechanisms worth knowing

- **Continuity**: a "global" button stores its data in the `continuity` table (Postgres) and its `customId` is `name:uuid`. The handler receives Zod-validated `data`. New button = class extending `BaseContinuity` + `Continuity.create(data)` when rendering. Rows older than 24 h are deleted by the manager (at start, then hourly); a button whose row is gone answers "Interaction expired". Buttons need their row for at most ~6 h (longest-lived state is the 6 h search storage).
- **ProcessingEmoteService**: state of the emote being added lives in Redis with a 15-min TTL, re-armed on every write (reads don't extend it). Its files live in one temp dir per processing key (`tetra-keep-<key>`), removed by a sweeper once the Redis key is gone. `store()` normalizes the file (animated WebP → GIF, animation detected from the file). Always go through this service, never through the files directly.
- **TempFileManager**: `create()` = `tetra-tmp-*` dir for a one-off operation, removed after 15 min; `createPersistent(key)` = `tetra-keep-*` dir tied to a Redis key. Only `tetra-` prefixed dirs are ever deleted, because `TEMP_DIR_PATH` may be the system tmp dir.
- **EmoteStorageService**: search results for pagination, in Redis for 6 h.
- **Redis client** (`src/redis`): one ioredis client per process. ioredis emits `error` on every reconnect attempt; the listener logs once per outage (error code only) and once on recovery.
- **Optimization**: single entry point `optimizeBuffer` (`src/lib/buffer/optimize-buffer.ts`), used by both the bot (via the `emoteOptimize` wrapper) and the API. Animations: resize to 128 px → ladder of gifsicle presets (binary search). Dropping frames preserves the total delay. It runs in-process, so heavy work in the API blocks the manager.
- **Editor tasks**: "Open in editor" in the bot creates an `editor_tasks` row (+ an `emotes` row with the source file URL); the panel edits the source file in the browser and submits a data URL. Deleting/submitting a task also removes its `emotes` row if nothing else references it. The panel loads the source file through `GET /tasks/:taskId/file` (third-party hosts don't send CORS headers). The browser side is the web editor, see [web/editor.md](web/editor.md#panel-integration-later).
- **Removed emotes**: the panel deletes an emote by inserting `emotes` + `removed_emotes` rows (in a transaction) *before* the Discord delete, and removes them again if Discord refuses. The shard's `emojiDelete` event then finds that row and skips; deletions done in Discord itself are recorded by the event with `deletedWithPanel: false`. Restore re-uploads the image from the Discord CDN.
- **User-facing errors**: throw `EmbeddedError` (`src/constants/errors.ts`), catch it in the handler and pass to `feedback.handleError(error)`. Unknown errors get a tracking ID and are logged.
- **Interaction log**: `interactions` table, id stored as exact `bigint` (snowflakes exceed `Number.MAX_SAFE_INTEGER`), `input` as a plain JSON object.
- **Loggers**: `CoreConsole` / `BotConsole` / `ApiConsole` from `#/loggers`; `.dev.*` logs only in development.

## API

Hono on `Bun.serve` (`src/api/index.ts`), the app is built in `src/api/app.ts`. The web app imports its type (`AppType`) for a typed client, see [web.md](web.md#talking-to-the-api).

- Base path `/api`. Error format everywhere: `{ error: string, reference?: string }` (`reference` = machine code or a hex trace id for 500s), type `ApiErrorBody`. Every error goes through `app.onError` (`src/api/error-handler.ts`); unknown routes answer `404 NOT_FOUND` in the same format.
- **Writing a route**: one file per handler (`<resource>.<action>.ts`) exporting `authFactory.createHandlers(requireAuth, validate(...), handler)` (or `userFactory` + `requireUser`, or `appFactory` for public routes), mounted in the resource router with `.get(path, ...handlers)`. Routers are **chained** (`new Hono().get(...).post(...)`): the chain is what carries the types to the client. Return `c.json(data, status)` with an explicit status. Errors are thrown as `TetraAPIError`, never returned, so they don't appear in the client types.
- **Middleware per route**, not per router: `requireAuth` (session + decrypted Discord `accessToken` + `discordUserId` from the DB) or `requireUser` (also fetches the Discord profile into `user`, one more Discord request, so only where `user` is needed).
- **Validation**: `validate(target, zodSchema)` (`src/api/validate.ts`) answers bad input with `400 INVALID_REQUEST_SCHEMA`; read the result with `c.req.valid(target)`.
- **Error codes** (`reference`, for the panel's toasts). Discord's own errors are mapped in `mapDiscordApiError` (`src/api/error-handler.ts`, codes from `RESTJSONErrorCodes`, re-exported by discord.js) with our message instead of Discord's:
  - `413 EMOTE_TOO_LARGE`: the optimizer couldn't fit 256 KB (`EmoteTooLargeError`, a subclass of `EmbeddedError` thrown by `optimizeBuffer`, so the bot still handles it as before and the API matches the type, not the text), or Discord refused the file size (50138, 50045). Add/restore emote, post task (which also checks the decoded data URL against 256 KB before calling Discord).
  - `409 GUILD_EMOJI_LIMIT_REACHED`: no free slots (30008, 30018 for animated). Add/restore emote, post task.
  - `403 BOT_MISSING_PERMISSIONS`: the bot lost Manage Expressions or access (50013, 50001). Add/restore/remove emote, post task. Not to be confused with `403 MISSING_PERMISSIONS` (the user lacks it).
  - `400 INVALID_EMOTE_NAME`: 50035 with an error under the `name` field. Other 50035s stay `DISCORD_API_ERROR`.
  - `400 INVALID_EMOTE_FILE`: sharp can't read the file (`UnsupportedEmoteFileError` from `normalizeEmoteBuffer`, mapped by type) or Discord rejected the image (50046). Add/restore emote, post task.
  - `413 FILE_TOO_LARGE`: a source download exceeded `MAX_SUPPORTED_SIZE` (10 MB, the bot's limit; `ResourceTooLargeError` from `getBufferFromUrl`). Add/restore emote, task file.
  - `413 PAYLOAD_TOO_LARGE`: request body over 2 MB (`bodyLimit`).
  - `400 DISCORD_API_ERROR`: any other `DiscordAPIError`, with Discord's message.
  - Remove emote answers `GUILD_EMOTE_DELETE_FAILED` for unmapped Discord errors on the delete; restore answers `DOWNLOAD_DATA_FAILED` when the removed image is gone from the CDN.
- **`GET /tasks/:taskId/file`**: the task's source file as a binary body (`c.body(bytes, 200, headers)`), only for the task's owner (`404 TASK_NOT_FOUND` otherwise). Downloaded with `getBufferFromUrl` (`safeFetch`, 10 MB cap, 15 s timeout per attempt, 2 attempts); no host allow-list, because task URLs include plain links the bot accepted. `Content-Type` is sniffed from magic bytes (gif/png/webp/jpeg only, otherwise `415 UNSUPPORTED_FILE_TYPE`), plus `Content-Length`, `Cache-Control: private, max-age=3600`, `X-Content-Type-Options: nosniff`. Errors: `400 URL_NOT_ALLOWED`, `413 FILE_TOO_LARGE`, `502 DOWNLOAD_DATA_FAILED` (upstream 4xx/5xx, network, timeout). Typed client: `$get` then `res.blob()`; only the 200 is in the types.
- **User guild list cache** (`src/lib/discord-oauth/user-guilds-cache.ts`): OAuth `/users/@me/guilds` is heavily rate-limited, so `getUserGuilds(discordUserId, accessToken)` caches it in Redis (`oauth-user-guilds:<discord id>`, 60 s) for `GET /guilds` and `getManageableGuild`. Only successful responses are cached, only `id`, `name`, `icon`, `owner`, `permissions`; the token is never in the key or value. The id is `discordUserId` set by `requireAuth` from the `users` row (the cookie's `user_discord_id` is unsigned, never use it). Login (callback) and logout delete the key; concurrent misses of one user share one Discord call. Redis that isn't `ready` or takes > 250 ms is skipped (ioredis would otherwise queue the command until reconnect) and Discord is asked directly. Trade-off: a permission change on Discord shows up in the panel within 60 s; Discord still enforces the bot's own permissions on every write.
- **`GET /guilds`** (dashboard list): one OAuth guild-list request (cached, see above) plus one `broadcastEval` (`collectGuildEmojiSlots`, `guilds.shared.ts`) that gets the user's guild ids as `context` and returns, per guild the shard has, emoji counts + `premiumTier` (counts, not emoji objects, so the IPC payload stays small). Guilds with the bot carry `emojis: { static, animated, limit }`; `guildsWithoutBotAvailableToAdd` doesn't.
- **`broadcastEval` functions are serialized** (discord.js sends `(${fn})(client, context)` as a string to each shard): they can't use imports or anything else from module scope; pass data through `context` (JSON). Type-only imports and `as` casts are fine (erased).
- **Guild access**: `getManageableGuild(guildId, c.var)` (needs `accessToken` + `discordUserId`) (`routes/guilds/guilds.shared.ts`) loads the guild through the bot and checks that the user is in it with `ManageGuildExpressions`; use it in every write endpoint.
- **Auth**: Discord OAuth with a random `state` stored in the session cookie. Cookie `tetra-session` (`src/api/middleware/session.ts`): `httpOnly`, `sameSite: lax`, `secure` in production, unsigned on purpose (it only holds a random 256-bit token checked against the DB), optional `COOKIE_DOMAIN`. Its value is base64 JSON, the format of the `cookie-session` package the Express API used, so old cookies stay valid. `sameSite: lax` requires the panel and the API to be on the same site (same registrable domain; any port on localhost). A cookie without `session_token` (e.g. only a pending OAuth state) answers `401 NO_SESSION` and is kept.
- **Login flow** (`routes/auth/`): the panel starts it with a plain browser navigation (not fetch) to `GET /api/auth?redirect=<path>`. `redirect` is optional and kept only if it is a relative panel path: `/panel`, `/panel/…` or `/panel?…`, at most 512 chars of printable ASCII without space or `\`, and unchanged by URL parsing (no dot segments, encoded dots, `//` in the path); anything else falls back to `/panel` silently. `oauth_state` and `oauth_redirect` are stored next to an existing session, so an abandoned login doesn't log the user out. `GET /api/auth/callback` never answers JSON: it consumes both keys (success or failure, an existing session stays) and redirects to `${FRONTEND_URL}<redirect>`; on failure with `error=<CODE>` set in the query (replacing an earlier `error`; a successful login drops a stale one): `ACCESS_DENIED` (cancelled on Discord, which sends `?error=access_denied&state=…` without `code`; checked before the state), `INVALID_OAUTH_STATE` (missing/mismatched state), `RATE_LIMITED` (auth limiter, handled in `app.onError`, always to `/panel`), `AUTH_CALLBACK_ERROR` (other Discord errors, missing code, token exchange or DB failure). Failures are logged with the first line of the message only: Drizzle appends query params (encrypted tokens) on later lines.
- **Sessions**: 30 days sliding. `sessions.last_used_at` is updated at most once per hour per session, which also re-sends the cookie; idle > 30 days → `401 SESSION_EXPIRED`. Expired rows are deleted hourly by the manager.
- **Rate limiting** (in-memory, per IP): ~120 req/min for `/api`, ~10/min for `/api/auth`; `429 RATE_LIMITED` with `Retry-After`. In production the client IP is the **last** `X-Forwarded-For` entry (exactly one proxy hop, the one Coolify adds; earlier entries are client-controlled), otherwise the socket address. With more proxy hops all clients would share one IP. Responses carry `RateLimit-Limit/Remaining/Reset`.
- **CORS**: origins from `CORS_ORIGINS` (comma-separated), default = `FRONTEND_URL` origin.
- **Hono behaviour the API relies on** (verified): headers set with `c.header` before a throw are kept on the error response built by `onError` (rate-limit headers, `Retry-After`); a thrown error is turned into a response inside the middleware chain, so middleware after `await next()` still runs (the session middleware clears or re-sends the cookie on 401s).
- **Testing without the bot**: import `app` from `src/api/app.ts` and call `app.fetch(new Request("http://localhost/api/..."), { server: { requestIP: () => ({ address: "10.0.0.1", family: "IPv4", port: 1 }) } })` (vary the address to avoid the rate limiter). Run it from `apps/core` (for `.env`) against a throwaway database: `POSTGRES_PORT=55432 REDIS_PORT=56379 docker compose -p tetra-api-test up -d --wait postgres redis`, `db:push` with `POSTGRES_URL` overridden, and `down -v` afterwards. A user row with `encryptToken("fake")` and a session row give a valid cookie (base64 JSON `{ session_token, user_discord_id }`); endpoints that call Discord then fail on the fake token, which is enough to check auth, validation and errors. Importing `app` doesn't log the bot in.
- **Bun.serve `idleTimeout`** is 120 s: Bun's default (10 s) closes the connection while an emote is optimized in-process.
- **JSON body limit**: 2 MB (editor submits emotes as base64 data URLs; other payloads too). Don't lower it. Over it: `413 PAYLOAD_TOO_LARGE` (checked through `app.fetch`; `Bun.serve`'s own `maxRequestBodySize` default, 128 MB, is far above it).
- **Discord tokens** (`users.access_token`, `refresh_token`) are encrypted with AES-256-GCM (`v1:<iv>:<tag>:<ciphertext>`) using `TOKEN_ENCRYPTION_KEY`. Values without `v1:` are legacy plaintext and get re-encrypted on the next write. Losing or changing the key logs everyone out.
- Guild access checks: the user must be in the guild (OAuth guild list) and have `ManageGuildExpressions` for write endpoints.

## Security rules

- Every server-side download of a user-supplied URL goes through `src/lib/network/url-guard.ts` (`safeFetch`): private/loopback/link-local/metadata IPs blocked, each redirect hop re-checked. `getBufferFromUrl` reads the body in chunks and stops at `maxBufferSize`, so a missing or false `Content-Length` can't make it buffer more; always pass a limit for user URLs. `POST /guilds/:id/emote` additionally requires https and an allow-listed host (7TV, BTTV, FFZ, Twitch, Discord CDN, Tenor, Giphy, Imgur).
- Records loaded by id must be checked against the guild/user in the URL (no cross-guild/cross-user access).
- Never log tokens, session values or keys.

## Discord platform facts (verified)

- An emoji id belongs to exactly one guild and can be deleted only once; re-adding or restoring creates a new id.
- Deleting an emoji through the REST API (e.g. from the panel) also fires the gateway `emojiDelete` event in the shard (intent `GuildExpressions`).
- Emoji slots per type (static and animated separately): 50 / 100 / 150 / 250 by boost tier. Discord's API docs don't list them (they come from the Boosting FAQ); discord.py's `Guild.emoji_limit` uses the same values and raises the base to 200 when the guild has the undocumented `MORE_EMOJI` feature (old partnered/verified guilds; it appears in the docs' example guild but not in the feature table or `discord-api-types`). `getEmojiSlotLimit` (`src/utils/discord/guild-parse-premium.ts`) does the same, for bot and API.
- Application emojis (`client.application.emojis`) are separate from `guild.emojis`, so guild emoji caches never contain them. Managed emojis (Twitch integration) are not counted as slots in Tetra (bot and API count the same way).
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

`tsconfig.api-types.json` emits declarations to `dist/types` (gitignored) for the web app's project reference; nothing else uses it.

## Docker

- Image: `docker/core.Dockerfile`, built from the **repo root** (it needs the root `bun.lock` and `tsconfig.base.json`). Base `oven/bun` (Debian slim) with `ffmpeg` and `gifsicle` from apt.
- `bun install` runs with `--ignore-scripts`: the `gifsicle` npm package has no linux/arm64 binary and its postinstall tries to compile from source. Only sharp's install script is run (downloads libvips), and the npm gifsicle path is symlinked to `/usr/bin/gifsicle`. A new dependency that needs an install script must be run explicitly in the Dockerfile.
- gifsicle versions differ (verified 2026-11): the npm package's prebuilt binaries (macOS, linux x64, Windows) are **1.93** and never updated; Debian's apt package in the image is **1.96**. So local dev runs 1.93 and the container 1.96 on every architecture. The flags used are the same in both, but output sizes can differ slightly. Using the system binary everywhere (brew/apt) would remove the mismatch and the Dockerfile workaround.
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
