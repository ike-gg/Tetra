# 7TV channel sync

Experimental, built behind `SEVENTV_SYNC_ENABLED` (default off) and not tested live yet. A server links a Twitch channel; when the streamer adds an emote to their **active** 7TV emote set, tetra adds it to the Discord server, and when they remove it, tetra removes the Discord emoji it created. This doc holds the agreed scope, how it is built, and the verified facts about 7TV's EventAPI.

## Scope (agreed)

- **Events only.** No initial import of the channel's emotes and no full reconciliation: only `add` / `remove` events from the active set, from the moment the sync is set up. A channel can hold 1000 emotes while a server has 250 static + 250 animated slots, so mirroring the whole set was rejected.
- **Only the active set.** When the streamer switches their active set, the sync moves its subscription to the new set; emotes already on Discord stay.
- **Renames are ignored** for now (7TV sends them as `updated` on the set; see below).
- **Missed events are lost.** If the bot is offline or the connection drops, events from that time are not replayed and not caught up. Accepted.
- **Link table.** Every synced emoji is stored as (guild, 7TV emote id) → Discord emoji id. A `remove` deletes only emojis from this table, so emojis added by hand are never touched. Key on the 7TV emote id, never the name.
- **Moderator actions.** A moderator deleting a synced emoji drops its link (a later 7TV `remove` does nothing). Editing it by hand keeps the link.
- **Per-server settings:**
  - basic filters: static, animated, zero-width, NSFW (7TV flag `1<<16`); plus the "never sync" list fed by dismissing with exclude;
  - optimization: up to which aspect ratio tetra adds automatically (always `contain`, the whole emote stays visible); wider emotes need review (Discord emojis are square);
  - advanced rules: an ordered list of condition sets with an action (review, skip, add).
- **Names** go through the existing name sanitizer (Discord: 2–32 chars, `[a-zA-Z0-9_]`). Use the set's alias (`name` on the active emote), not the emote's original name.
- **Needs review**: emotes that weren't added, newest first, each with its reason: too large, aspect ratio over the threshold, no free slot (static and animated counted separately), turned off by a basic filter, matched a rule.
  - Actions per entry: open in the editor and add, retry (e.g. after a slot frees up), dismiss (optionally "never sync").
  - A `remove` event for an emote in review removes its entry.
  - A freed slot doesn't add anything automatically; the admin retries by hand.

## Implementation

Code in `src/stv-sync/` (manager process; never imports `@/bot`), routes in `src/api/routes/stv-sync/`, tables in `src/db/schemas/stv-sync.ts`.

| File | Contents |
|---|---|
| `event-api/socket.ts` | One WebSocket: Hello, server heartbeat watchdog (3 missed intervals → dead), 15 s hello timeout, Subscribe (never twice per connection), acks, End of Stream code (op 7 wins over the close frame). |
| `event-api/client.ts` | `EventApiClient`: wanted subscriptions spread over "slots" (one connection each, filled up to the server's `subscription_limit`, 500). Reconnect op 4 → a new socket subscribes everything, then the old one closes 5 s later (overlap). Failures → exponential backoff with jitter (1 s → 60 s, reset after a connection lived 1 min), 4007 → 5–7.5 min, client-bug codes (4001/4002/4009/4010) → logged as errors, 5–7.5 min. No unsubscribe op is used (not verified): a subscription no longer wanted stays on its connection until the next reconnect, its events are dropped. Every dispatch is logged raw (cut at 4000 chars) and parsed with Zod; unknown shapes are logged and skipped. |
| `sync-service.ts` | `stvSync` singleton, started from `src/index.ts`. `refresh()` reads the enabled configs and wants one `emote_set.update` per distinct set and one `user.update` per distinct 7TV user (guilds sharing a channel share them; events fan out). Dedupes changes by (set, emote, add/remove, 7TV's `timestamp`) for 10 min (30 s without a timestamp). Renames are logged and ignored. A `user.update` with a new `emote_set_id` under `connections` moves every config of that user to the new set and refreshes. |
| `job-queue.ts` | `runForGuild`: per-guild serial job runner, internal (events, retries and editor uploads of one guild never overlap, so slot counts stay right). `Semaphore(2)` around downloads and optimization. |
| `add-synced-emote.ts` | Add flow, see below; `linkSyncedEmoji`. |
| `remove-synced-emote.ts` | Drops the review entry, deletes the link, then the Discord emoji (Unknown Emoji = fine; other failures put the link back). |
| `settings.ts`, `rules.ts`, `review.ts`, `sync-emote.ts`, `stv-user.ts`, `links.ts` | Settings schema and basic filters; advanced rules (schema, defaults, evaluation); review rows and their messages; 7TV active emote → source and filter input; 7TV user by Twitch id; link drop for the shard's `emojiDelete`. |
| `sync-log.ts` | Activity log: `logSyncActivity` (never throws), trim, list, serializer. See [Activity log](#activity-log). |

### Add flow

Every job first re-reads the config (enabled, same set). Then:

1. **Basic filters** (events only; a retry skips them, the admin picked the emote): excluded id → skipped silently, never in review; a toggle → review `FILTERED` with the filter name, nothing downloaded.
2. Already linked (guild, 7TV emote) → skipped.
3. **Rules** (events only; a retry skips them too), see [Advanced rules](#advanced-rules). `skip` → activity log only, nothing in review; `review` → review `RULE` with the rule's position; `add` or no match → on.
4. Download `4x.gif` (animated) / `4x.png` through `assertAllowedEmoteSourceUrl` + `getBufferFromUrl` (10 MB, 15 s, 2 attempts), normalize, read width / frame height / frames / delays. Failure → `FAILED` `download` / `invalid_file`. Skipped when a rule already downloaded it.
5. Aspect ratio (long side / short side) over `maxAspectRatio` → `ASPECT_RATIO` with the ratio. Applies to `add` rules too.
6. Free slot of the file's type (from the file, not 7TV's flag): `GET /guilds/:id` over REST (emojis + tier + features, not the shard cache), managed emojis not counted, `getEmojiSlotLimit` → `NO_SLOT` with `static`/`animated`. The guild is read once per job (rules reuse it; jobs of a guild run serially).
7. `optimizeBuffer(buffer, { fitting: "contain" })` → `TOO_LARGE` on `EmoteTooLargeError`.
8. Create the emoji with `parseDiscordRegexName(alias)`; Discord errors map to `NO_SLOT` (30008/30018), `TOO_LARGE` (50138/50045), `FAILED` `permissions` (50013/50001), `invalid_file` (50046), `discord` (others). Anything unexpected → `FAILED` `unknown:<error code>` (logged with `logErrorCode`).
9. Insert the link and drop the review entry in one transaction.

Download and optimization results are cached in memory for 10 min (by file URL), so several servers syncing one channel optimize an emote once. Optimization runs in the manager like the API's, so a burst blocks the API for its duration.

### Decisions

- **Unlink** drops links, the review list and the activity log; the Discord emojis stay. Links are keyed by 7TV emote id, so stale links could let another channel's removals delete emojis after a relink. Linking a different channel does the same; relinking the same channel keeps all three.
- **Pause** (`enabled: false`) keeps links, the review list and the activity log and unsubscribes (when no other server needs the set). Events while paused are lost.
- **Review** has one entry per (guild, 7TV emote); a new failure updates it (reason, `flaggedAt`). Freed slots never retry anything. A `skip` rule leaves an existing entry alone.
- **Moderator deletes**: the shard's `emojiDelete` handler drops the link (`dropSyncLinkForEmoji`, idempotent). Sync removals delete the link before calling Discord, so their own `emojiDelete` finds nothing; the existing removed-emotes record is still written (`deletedWithPanel: false`), so the panel can restore them.
- **Rule fields were cut down** before release to what admins actually use: original name, name length, renamed, name taken, author, added by, tags, listed, emote age, width/height and `matches_regex` were dropped (with the GraphQL actor lookup and the regex guard they needed).
- **Wording**: 7TV's `1<<16` flag is called "sexual" in its code but covers more; user-facing text says "NSFW" and never "sexual".

### Settings

Stored as `jsonb` in `stv_sync_configs.settings`, validated by `syncSettingsSchema`; reads go through `readStoredSettings`: unknown keys are dropped, missing keys take their default, and each section (`filters`, `excludedEmoteIds`, `optimization`) that is invalid falls back to its default. `advancedRules` that isn't an array falls back to the default rules; otherwise each rule that doesn't parse (e.g. a removed field) is dropped on its own, duplicates by id too. Old keys (`skipZeroWidth`, `skipNsfw`) aren't converted, they just fall to the defaults. Filters are "include" toggles: on = that kind is synced, off = it goes to review. Defaults:

```json
{
  "filters": { "includeStatic": true, "includeAnimated": true, "includeZeroWidth": true, "includeNsfw": true },
  "excludedEmoteIds": [],
  "optimization": { "maxAspectRatio": 2 },
  "advancedRules": [
    { "id": "wide", "enabled": true, "action": "review",
      "conditions": [{ "field": "aspect_ratio", "operator": "gt", "value": 1.75 }] },
    { "id": "large-file", "enabled": true, "action": "review",
      "conditions": [{ "field": "file_size_kb", "operator": "gt", "value": 1024 }] }
  ]
}
```

`excludedEmoteIds` ≤ 1000 7TV ids (the "never sync" list, filled by dismiss with `exclude`, oldest dropped first). `maxAspectRatio` 1–4, rounded to one decimal; a 7TV emote wider than 4:1 always needs review. It is a hard limit checked after the rules: even an `add` rule can't bypass it. Zero-width = active flag `1` or emote flag `1<<8`; NSFW = emote flag `1<<16`.

### Advanced rules

`advancedRules`: ≤ 25 rules `{ id (1–32 chars [A-Za-z0-9_-], unique, client-generated), enabled, conditions (1–5, all must match), action: review | skip | add }`. Top to bottom, the first enabled rule whose conditions all match wins; no match = normal flow. Positions count disabled rules too, so `RULE` detail `2` is the second rule in the list. Conditions are checked in order and stop at the first miss; file and server facts are loaded lazily (download / one `GET /guilds/:id`) only when a condition reaches them, so put cheap conditions first.

Conditions `{ field, operator, value }` (`ruleConditionSchema`, a Zod union of objects, so the client gets a discriminated union on `field` + `operator`). The schema is the source of truth; nothing else is accepted.

| field | operators | value | source |
|---|---|---|---|
| `name` (the alias in the set) | `contains`, `not_contains`, `starts_with`, `ends_with`, `equals`, `not_equals` (case-insensitive) | string 1–100 | event |
| `aspect_ratio` (long / short side) | `gt`, `gte`, `eq`, `lte`, `lt` | 0–100 | file |
| `file_size_kb` (downloaded file, KiB) | `gt`, `gte`, `eq`, `lte`, `lt` | 0–10240 | file |
| `duration_s` (static: 0) | `gt`, `gte`, `eq`, `lte`, `lt` | 0–3600 | file |
| `frame_count` (static: 1) | `gt`, `gte`, `eq`, `lte`, `lt` | int 0–10000 | file |
| `free_slots` (of the file's type, before adding) | `gt`, `gte`, `eq`, `lte`, `lt` | int 0–250 | server + file |

Number operators: `gt` / `lt` compare the raw measured value (unchanged from before). `eq` rounds both the measured value and the setting to the field's precision and compares those: `aspect_ratio` 2 decimals, `duration_s` 1 decimal, `file_size_kb` whole KiB, `frame_count` / `free_slots` exact (integers). `gte` = `gt` or `eq`, `lte` = `lt` or `eq`, so a 1.749 ratio matches `eq 1.75` and `gte 1.75` but not `gt 1.75`. Precision lives in `EQ_DECIMALS` in `rules.ts`; the schema doesn't limit the value's decimals.

### Activity log

A compact per-guild history for the panel (`stv_sync_log`, `sync-log.ts`). Written with `logSyncActivity`, which catches and prints its own errors (`[7TV-SYNC]`), so logging never breaks a job. Not logged on purpose: already-linked adds, "never sync" (excluded) adds, removals with nothing to remove and no review entry, renames, settings changes, unlink (it clears the log).

| `action` | when | extra fields |
|---|---|---|
| `added` / `added_retry` / `added_upload` | emoji created by an event / review retry / editor upload from review | `emote.discordEmojiId` |
| `removed` | a remove event deleted the linked emoji (also when Discord said it was already gone) | `emote.discordEmojiId` |
| `review` | sent to review (event filter or add flow, or a retry that failed again) | `reason` (review reason), `detail` (review detail) |
| `skipped_rule` | a `skip` rule matched | `detail` = rule position |
| `review_removed` | a remove event cleared the emote's review entry | |
| `link_dropped` | a moderator deleted a synced emoji (shard's `emojiDelete`); `name` is the Discord name there | `emote.discordEmojiId` |
| `dismissed` | dismissed from review | `excluded` (also "never sync") |
| `failed` | unexpected error in a job, or Discord refused a removal (the link stays) | `failure: { stage: add \| remove, code }`, the code is in the server log (`logErrorCode`) |
| `set_switched` | the streamer's active set changed | `set: { fromSetId, toSetId }` (null = none) |
| `linked` | channel linked (also a relink of the same channel) | `channel: { login, twitchId }` |
| `paused` / `resumed` | `PATCH /` changed `enabled` | |

`emote` = `{ stvEmoteId, name, animated, discordEmojiId }` (null for the last four rows): `name` is the set alias at the time (null when a removal event came without it), `animated` 7TV's flag or the file's when known. Add failures inside the add flow land in review (`review` with `FAILED`), not as `failed`.

Retention: trimmed on every insert to the guild's newest 200 entries and 30 days (one `DELETE` with a subquery, cheap at this size). Index `(guild_id, id desc)`: pages and trims go by id (serial, so insert order = time order) instead of `created_at`. Verified in a rolled-back transaction on Postgres: 206 rows (one 31 days old) trim to the newest 200, other guilds untouched, `before` paging continues at the right row.

### Tables

- `stv_sync_configs` (pk `guild_id`): Twitch id/login/display name, 7TV user id, active set id (null without one), `enabled`, `settings`, `linked_by` (Discord user id), timestamps.
- `stv_sync_links`: (guild, 7TV emote) unique → Discord emoji id, name, animated; index on the emoji id.
- `stv_sync_review`: (guild, 7TV emote) unique; alias, animated, file and preview URL, width/height, author, `reason` (`FILTERED | RULE | TOO_LARGE | ASPECT_RATIO | NO_SLOT | FAILED`), `detail`, `flagged_at`. Renamed from `stv_sync_queue` before release; `db:push` proposes dropping the old table, which is fine (nothing released).
- `stv_sync_log`: guild, `action`, nullable emote columns (`stv_emote_id`, `name`, `animated`, `discord_emoji_id`), `reason` / `detail` (per action: review reason/detail, rule position, `excluded`, failure stage/code, old/new set id, Twitch id), `created_at`. See [Activity log](#activity-log).

### API

Under `/api/guilds/:guildId/sync`, every route `requireAuth` + `getManageableGuild` (read routes too: settings are admin data). Review entries are loaded by id **and** guild. `GET /log` reads the activity log. See [core.md](../core.md#api) for the shapes; codes: `404 SYNC_NOT_LINKED`, `404 REVIEW_ENTRY_NOT_FOUND`, `404 STV_USER_NOT_FOUND`, `404 CHANNEL_NOT_FOUND`, `502 UPSTREAM_ERROR`, `409 EMOTE_ALREADY_SYNCED`, plus the upload codes for add-after-edit.

## 7TV EventAPI (verified 2026-11-17)

Sources: a live connection to `wss://events.7tv.io/v3`, the archived [SevenTV/EventAPI](https://github.com/SevenTV/EventAPI) README, and the current server code in the [SevenTV/SevenTV](https://github.com/SevenTV/SevenTV) monorepo (`apps/event-api`, `shared/src/event.rs`, `shared/src/event_api/payload.rs`, `shared/src/old_types/mod.rs`). Where the README and the code disagree, the code wins (noted below).

### Connection

- WebSocket `wss://events.7tv.io/v3` (also SSE at `https://events.7tv.io/v3`; use the WebSocket because SSE can't add subscriptions after connecting: its REST endpoint for that "is currently unavailable"). No auth needed for public objects. Messages are JSON `{ op, t, d }`.
- On connect the server sends **Hello (op 1)**: `{ heartbeat_interval, session_id, subscription_limit, instance: { name, population } }`. Live values: `heartbeat_interval` ≈ 47–49 s (45 s ± jitter), `subscription_limit` **500** per connection. More channels than that need more connections.
- **Heartbeat (op 2)** comes from the server (`{ count }`); the client sends none. No heartbeat for 3 intervals = dead connection, reconnect.
- **Connection lifetime ≈ 1 h** (server config `ttl`, jittered). When it expires the server sends **Reconnect (op 4)** and closes. Plan for regular reconnects, not just failures.
- **Resume (op 34) is not supported**, despite the README: the server answers it with an ack carrying `subscriptions_restored: 0` and replays nothing. After every reconnect, subscribe again. Events between the two connections are lost (accepted, see scope). To avoid the gap on the hourly TTL, open the new connection and subscribe before closing the old one, and dedupe by (emote set id, emote id, add/remove).
- Close codes (End of Stream op 7 `{ code, message }` before the close): 4000 server error, 4005 rate limited, 4006 restart, 4007 maintenance (reconnect after ≥ 5 min with jitter), 4008 timeout → reconnect. 4001/4002/4009/4010 mean a client bug (log, don't loop). The WebSocket close frame itself carried `1008` with the reason text in the live test, so read the code from op 7, not from the close frame.

### Subscriptions

- **Subscribe (op 35)**: `{ op: 35, d: { type, condition: { object_id } } }`. The server acks with op 5 `{ command: "SUBSCRIBE", data: { id, type, condition } }`. Subscribing twice to the same type + condition closes the connection with 4009, so track what is subscribed.
- **No firehose:** `emote_set.update` without a condition answers op 6 `Invalid Subscription Condition` and closes with 4002 (the README's "subscribe with no conditions" no longer works). Every subscription needs an `object_id`.
- Conditions the server accepts: `{ object_id }`, or `{ ctx: "channel", platform: "TWITCH" | "KICK" | "YOUTUBE", id }` (used by the 7TV extension for cosmetics and presence). Use `object_id`.
- **Per synced channel, two subscriptions:**
  - `emote_set.update` with the active set's id → emote add / remove / rename.
  - `user.update` with the 7TV user id → active set switches.
- Ids come from `GET https://7tv.io/v3/users/twitch/<twitch id>`: `emote_set_id` (or `emote_set.id`) is the active set, `user.id` the 7TV user id. Old accounts can have a set id equal to the user id (e.g. xQc: both `01FE9DRF000009TR6M9N941CYW`); both subscriptions were acked live.
- Several servers syncing the same channel share one subscription; fan out the event in tetra.

### Dispatch (op 0) shapes

`d = { type, body: ChangeMap }`, `ChangeMap = { id, kind, actor?, updated?, pushed?, pulled?, ... }`, `ChangeField = { key, index?, nested?, type, old_value?, value? }`. The server groups events per (type, object id), so **one dispatch can carry several pushed / pulled entries** (e.g. a bulk change). Iterate all of them.

- **Emote added** (`emote_set.update`, `body.id` = set id): `pushed[]` entry with `key: "emotes"`, `index`, and `value` = the active emote:
  `{ id, name /* alias in this set */, flags, timestamp, actor_id, data: { id, name, flags, animated, listed, owner, host: { url, files } } }`
- **Emote removed**: `pulled[]` entry with `key: "emotes"`, `index`, and `old_value` = the active emote. `old_value.data` can be `null` (the emote itself was deleted from 7TV), so match on `old_value.id`.
- **Emote renamed in the set**: `updated[]` entry with `key: "emotes"`, `index`, `old_value` / `value` = the active emote with the old / new `name` (ignored for now).
- **Active set switched** (`user.update`, `body.id` = user id): `updated[]` with `key: "connections"`, `nested: true`, one entry per connection (`index`), whose `value` is `[ChangeField]` containing `emote_set_id` (`old_value` → `value`) and `emote_set`. Take the new id from the connection whose platform is Twitch (since v4 every connection shares one active set, so any entry has the same value).

### Flags and fields (for filters and rules)

- Active emote `flags` (per set): `1` = zero-width, `1<<16` / `1<<17` / `1<<18` = override Twitch global / Twitch subscriber / BTTV.
- Emote `data.flags`: `1` = private, `1<<1` = authentic, `1<<8` = zero-width by default, `1<<16` = sexual (NSFW), `1<<17` = epilepsy, `1<<18` = edgy, `1<<24` = Twitch disallowed. The current server only ever sets private, zero-width and sexual in v3 output.
- `data.animated` is 7TV's flag; the slot type comes from the downloaded file.
- Also on the active emote (checked against REST `GET /v3/users/twitch/<id>`, 2026-11-17): `actor_id` (who added it; null on old entries, 968 of 969 set in a big set), `data.tags` (array), `data.listed` (boolean), `data.owner` `{ id, username, … }`. The dispatch shape comes from the same server type (not seen live yet). Only `owner` is parsed (review's author); the rest is unused since rules were cut down.

### Not verified yet

- No live add/remove dispatch was captured (it needs a 7TV account whose set we can change); the shapes above come from the server code. The parser follows them and accepts extra fields; the first live dispatches are logged raw (`[7TV-SYNC] dispatch …`), check them against this section. The active emote shape was checked against REST `GET /v3/users/twitch/<id>` (same v3 type): all 969 emotes of a big set parse.
- Unsubscribe (op 36 in the old README) isn't verified, so the client never sends it.
- No per-IP connection limit was found in the code (`connection_limit` is unset by default); the deployed value is unknown.
- Discord's rate limit on creating emojis isn't measured. Events come one at a time, so it matters only for bursts (a streamer adding many emotes at once).
