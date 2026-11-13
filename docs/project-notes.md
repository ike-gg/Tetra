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
- Formatting, import order and linting: **Biome** (`biome.json`), no Prettier/ESLint. Import groups: external → `@/` → relative → `#/`, `lineWidth: 90`. Type-aware promise rules (`noFloatingPromises`, `noMisusedPromises`) are on: await promises or mark fire-and-forget with `void`.
- Comments: **sparse**, only where they explain "why".
- Validate external input/data with Zod.
- User-facing strings: shared ones live in `src/constants/messages.ts`.

## Scripts

- `bun run dev` – watch, `bun run start` – production
- `bun run deploy:dev` – register commands on `DEV_GUILDS`; `bun run deployCommands` – globally
- `bun run db:push` / `db:studio` – Drizzle
- `bun run check` – Biome lint + format + imports (`check:fix` applies fixes), `bun run lint`, `bun run format`
- `bun run typecheck` – `tsc --noEmit` (Biome doesn't type-check; both must pass)
- No tests yet.

Environment variables are validated in `src/env.ts` (Zod + a readable error table). Twitch/Tenor/Imgur API keys and `SESSION_KEYS` are required even when the API is disabled.

## Agent pitfalls

- New command/button = new file in the right directory with `export default`. No manual registration, but slash commands must be deployed (`deploy:dev`).
- Always work with an emote through `ProcessingEmoteService`, never directly through files.
- `emote.animated` is determined from the file in `store()`. Don't trust flags from sources.
- Change optimization only in `src/lib/buffer/` and verify on real GIFs (size, dimensions, frame count, total delay).
- API code runs in the manager process, bot code in the shards. See the `@/bot` warning above.
