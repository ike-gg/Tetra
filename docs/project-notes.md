# Tetra – project notes

Source material for `CLAUDE.md`. As of 2026-11-01.

## What Tetra is

A Discord bot for managing emotes. Main feature: adding an emote from 7TV / BTTV / FFZ / a link / a message with **automatic optimization** to fit Discord's 256 KB limit. There is also a web panel (separate repo: Tetra Panel) that this project serves a REST API for.

**Stack:** Bun (runtime, `bun run`, `Bun.spawn`), TypeScript (strict), discord.js 14 with sharding, Express 5 (API), Drizzle + PostgreSQL, Redis (ioredis), sharp + gifsicle (images), ffmpeg/yt-dlp/Cobalt (`/media` command), Zod (validation everywhere). Deployed via nixpacks.

## Architecture

Two kinds of processes:

- **Manager process** (`src/index.ts`): `ShardingManager`, Discord OAuth, the **Express API** (when `API_ENABLED`). Exports `discordOauth` and `shardingManager`, which the API imports from `@/index`.
- **Shard processes** (`src/bot.ts`): discord.js client, events, interactions. Exports `internalClient`.

⚠️ Never import `@/bot` from API code (manager process): it creates and logs in a second client. To talk to Discord from the API use `discordRestApi` (`src/lib/discord-rest-api`) or `shardingManager.broadcastEval`.

### Directories

| Path | Contents |
|---|---|
| `src/interactions/commands/{global,internal}/…` | Slash/context commands. **Loaded automatically** from the directory (`InteractionsFileManager`). The file must `export default` a handler instance. `internal` is dev-only. |
| `src/interactions/buttons/{generic,global}`, `select-menu/global` | Buttons and select menus. `global` = "continuity" (see below). |
| `src/interactions/subcommands` | `/addemote` subcommand logic. |
| `src/emotes/` | Emote flow: `prepare-emote` → `edit-emote-by-user` → `add-emote-to-guild`; sources in `source/{7tv,bttv,ffz,file}`. |
| `src/lib/buffer/` | Optimization pipeline (sharp + gifsicle). |
| `src/lib/media/` | Platform handlers for `/media`. |
| `src/services/` | `ProcessingEmoteService` (state of the emote being added), `EmoteStorageService` (search results, pagination). |
| `src/components/` | Functions returning `BaseMessageOptions` (embeds + buttons). |
| `src/api/` | REST API for the panel. |
| `src/db/schemas/` | Drizzle schema (no migrations in the repo, `db:push` is used). |
| `src/helpers/` | Loggers (`#/loggers`), temp files, interaction loader. |
| `src/utils/` | Misc helpers; `managers/feedback-manager.ts` = replies to the user. |

### Mechanisms worth knowing

- **Continuity**: a "global" button stores its data in the `continuity` table (Postgres) and its `customId` is `name:uuid`. The handler receives Zod-validated `data`. New button = class extending `BaseContinuity` + `Continuity.create(data)` when rendering.
- **ProcessingEmoteService**: state of the emote being added lives in Redis (15 min TTL), the buffers themselves in temp files on disk (`TempFileManager`, auto-deleted after 15 min). `store()` normalizes the file (animated WebP → GIF, animation detected from the file).
- **Optimization**: single entry point `optimizeBuffer` (`src/lib/buffer/optimize-buffer.ts`), used by both the bot (via the `emoteOptimize` wrapper) and the API. Animations: resize to 128 px → ladder of gifsicle presets (binary search). Dropping frames preserves the total delay.
- **User-facing errors**: throw `EmbeddedError` (`src/constants/errors.ts`), catch it in the handler and pass to `feedback.handleError(error)`. Unknown errors get a tracking ID.
- **Loggers**: `CoreConsole` / `BotConsole` / `ApiConsole` from `#/loggers`; `.dev.*` logs only in development.

## Conventions

- Everything in the repo is in **English**: code, comments, docs, commit messages.
- File and directory names: **kebab-case** (`get-emote-from-url.ts`). Exception: API routes `guilds.get-guild.ts` (`resource.action`). Components: `*.component.ts`, services: `*.service.ts`.
- Aliases: `@/*` → `src/*`, `#/*` → `src/helpers/*`. New code uses aliases instead of `../../..`.
- Import order is enforced by Prettier (`@trivago/prettier-plugin-sort-imports`): external → `@/` → relative → `#/`. `printWidth: 90`.
- Comments: **sparse**, only where they explain "why".
- Validate external input/data with Zod.
- User-facing strings: shared ones live in `src/constants/messages.ts`.

## Scripts

- `bun run dev` – watch, `bun run start` – production
- `bun run deploy:dev` – register commands on `DEV_GUILDS`; `bun run deployCommands` – globally
- `bun run db:push` / `db:studio` – Drizzle
- Typecheck: `npx tsc --noEmit -p .` (no script yet; passes with 0 errors)
- No tests, no linter.

Environment variables are validated in `src/env.ts` (Zod + a readable error table). Twitch/Tenor/Imgur API keys and `SESSION_KEYS` are required even when the API is disabled.

---

## To fix

### 🔴 Security (details in the API audit)

1. **IDOR in `POST /guilds/:guildId/restore/:restoreId`**: the record is not checked against `guildId`, so emotes removed on someone else's server can be restored onto yours.
2. **SSRF in `POST /guilds/:guildId/emote`**: any URL goes to a server-side `fetch` (localhost, cloud metadata). Also applies to `/addemote bylink`.
3. **OAuth without `state`** (login CSRF); `console.log(session)` logs the session token in `/auth/callback`.
4. Cookie: hardcoded `domain: "localhost"`, `secure` without `trust proxy`, `signed: false`; sessions never expire and there is no logout; no rate limiting (commented out).

### 🟠 Bugs

1. **`stv-get-emotes-by-query.ts`: infinite loop.** `while (data.errors || tries > 5)`: if 7TV keeps returning GQL errors the loop never ends (a new request every 1 s). Should be `data.errors && tries < 5`. Also `Messages.EMOTE_NOT_FOUND.toString()` yields `"[object Object]"`.
2. **`interaction-logger.ts`: ID precision loss.** `id: Number(interaction.id)`, but a snowflake (~1.3e18) > `Number.MAX_SAFE_INTEGER`. Stored IDs are rounded, PK collisions are possible (the insert fails silently in `catch`). The column should be `bigint({ mode: "bigint" })` or `varchar`. Also `input` is stored as a JSON string inside `jsonb`.
3. **`interaction-handler.ts`: command handlers are not awaited** and the `try {} catch {}` is empty. Command errors end up as unhandled rejections with no feedback to the user. Same in `events/interaction-create.ts` (`interactionHandler` without `await`).
4. **`events/guild-emoji-delete.ts`**:
   - writes `deletedWithPanel: true` even for emotes deleted in Discord;
   - the `emote ↔ removed` relation is `one`, but one emote can be removed on many servers (a removal on a second server is not recorded);
   - no error handling in the event handler.
5. **`bot.ts`**: `importInteractions(client)` is not awaited before `login`, so an interaction right after startup can hit an empty collection.
6. **The `continuity` table grows forever**: every rendered button is a new row and nothing deletes them. Needs a cron/TTL (e.g. delete rows older than 24 h) or a move to Redis with TTL.
7. **`transform-to-emote.ts`**: `prepareEmote` is outside the `try`, so download/normalization errors never reach `feedback.handleError`.
8. **`guild-parse-premium.ts`**: the non-boosted file limit is 8 MB (Discord is now 10 MB). Only `deletable` emotes are counted (verify this matches how Discord counts slots).
9. The Redis TTL is extended (`setCustomName`, `update*`), but temp files are not. After an edit near the 15-minute mark the user can get "Buffer was removed due to inactivity".

### 🟡 Tech debt / cleanup

- **Dead code** (not imported anywhere):
  - `src/api/tasks/*` (also broken: Prisma, `res.locals`, inverted `refine`)
  - `utils/managers/task-manager.ts` + `types/task-types.ts`
  - `lib/shards/get-shard-with-guild.ts`
  - `utils/archive/emote-border.ts`
  - `utils/media/watermark-{image,video}.ts`
  - `utils/get-tiktok-post.ts`
  - `utils/extract-links.ts`
  - dead types in `types/index.ts` (`Executable*`, `ExtractedEmote`)
  - commented-out code (`submit-error-log.ts`, `save-to-panel.ts`)
- **`Save to Panel`** is a registered command that replies `"TODO"`. Hide it until implemented.
- **Dependencies**:
  - Prisma (`prisma`, `@prisma/client`) – only used by dead code;
  - npm `crypto` package (deprecated shim) and `ffmpeg` (0.0.4) – unnecessary;
  - `ts-node`, `tsx` – redundant with Bun;
  - `express-rate-limit` – unused;
  - `node-fetch` v2 – Bun has native `fetch`;
  - `@types/lodash` is in `dependencies`;
  - `sharp` 0.31 is old (0.33+ has better GIF/WebP support).
- **Circular dependency** `src/index.ts` ↔ `src/api/*` (the API imports `@/index`). Works because usage is lazy, but `discordOauth`/`shardingManager` should move to a separate module.
- **Hardcoded values**: error log channel ID (`submit-error-log.ts`), `https://panel.tetra.lol` (`feedback-manager.ts`), CORS origins → move to `env`.
- **Outdated README**: `npm`, `prisma:push`, `npm run deploy` (the scripts are `bun`, `db:push`, `deployCommands`).
- **No migrations** (`drizzle/` is not in the repo, only `db:push`), risky in production. No indexes on `emotes.external_id`, `sessions.session_token`.
- **Mixed state stores**: continuity in Postgres, processing in Redis + local disk. Temp files will break when scaling beyond one machine.
- **No queue/concurrency limit** for sharp/gifsicle/ffmpeg: a few large files at once will hog shard CPU.
- **No tests.** Easiest start: `src/lib/buffer` (pure buffer functions), e.g. `bun test` with a few fixture GIFs.
- Add `typecheck` and `format` scripts to `package.json` so typecheck can be a CI gate.
- `ShardingManager("./src/bot.ts")` depends on the working directory; prefer `path.join(import.meta.dir, "bot.ts")`.

## Agent pitfalls

- New command/button = new file in the right directory with `export default`. No manual registration, but slash commands must be deployed (`deploy:dev`).
- Always work with an emote through `ProcessingEmoteService`, never directly through files.
- `emote.animated` is determined from the file in `store()`. Don't trust flags from sources.
- Change optimization only in `src/lib/buffer/` and verify on real GIFs (size, dimensions, frame count, total delay).
- API code runs in the manager process, bot code in the shards. See the `@/bot` warning above.
