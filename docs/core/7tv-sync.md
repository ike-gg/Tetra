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
  - filters (name contains / regex, static vs animated, zero-width, NSFW, author, excluded emote ids);
  - optimization thresholds: up to which size / aspect ratio tetra optimizes automatically, beyond which the emote goes to the queue for manual adjustment (Discord emojis are square).
- **Names** go through the existing name sanitizer (Discord: 2–32 chars, `[a-zA-Z0-9_]`). Use the set's alias (`name` on the active emote), not the emote's original name.
- **Queue** of emotes that weren't added, newest first, each with its reason: too large, aspect ratio over the threshold, no free slot (static and animated counted separately), rejected by a filter.
  - Actions per entry: open in the editor and add, retry (e.g. after a slot frees up), dismiss.
  - A `remove` event for an emote in the queue removes it from the queue.
  - A freed slot doesn't add anything automatically; the admin retries by hand.

## Implementation

Code in `src/stv-sync/` (manager process; never imports `@/bot`), routes in `src/api/routes/stv-sync/`, tables in `src/db/schemas/stv-sync.ts`.

| File | Contents |
|---|---|
| `event-api/socket.ts` | One WebSocket: Hello, server heartbeat watchdog (3 missed intervals → dead), 15 s hello timeout, Subscribe (never twice per connection), acks, End of Stream code (op 7 wins over the close frame). |
| `event-api/client.ts` | `EventApiClient`: wanted subscriptions spread over "slots" (one connection each, filled up to the server's `subscription_limit`, 500). Reconnect op 4 → a new socket subscribes everything, then the old one closes 5 s later (overlap). Failures → exponential backoff with jitter (1 s → 60 s, reset after a connection lived 1 min), 4007 → 5–7.5 min, client-bug codes (4001/4002/4009/4010) → logged as errors, 5–7.5 min. No unsubscribe op is used (not verified): a subscription no longer wanted stays on its connection until the next reconnect, its events are dropped. Every dispatch is logged raw (cut at 4000 chars) and parsed with Zod; unknown shapes are logged and skipped. |
| `sync-service.ts` | `stvSync` singleton, started from `src/index.ts`. `refresh()` reads the enabled configs and wants one `emote_set.update` per distinct set and one `user.update` per distinct 7TV user (guilds sharing a channel share them; events fan out). Dedupes changes by (set, emote, add/remove, 7TV's `timestamp`) for 10 min (30 s without a timestamp). Renames are logged and ignored. A `user.update` with a new `emote_set_id` under `connections` moves every config of that user to the new set and refreshes. |
| `job-queue.ts` | `runForGuild`: per-guild serial chain (events, retries and editor uploads of one guild never overlap, so slot counts stay right). `Semaphore(2)` around downloads and optimization. |
| `add-synced-emote.ts` | Add flow, see below; `linkSyncedEmoji`. |
| `remove-synced-emote.ts` | Drops the queue entry, deletes the link, then the Discord emoji (Unknown Emoji = fine; other failures put the link back). |
| `settings.ts`, `queue.ts`, `sync-emote.ts`, `stv-user.ts`, `links.ts` | Settings schema and filters; queue rows and their messages; 7TV active emote → source/filter input; 7TV user by Twitch id; link drop for the shard's `emojiDelete`. |

### Add flow

Every job first re-reads the config (enabled, same set). Then:

1. **Filters** (events only; a retry skips them, the admin picked the emote): excluded id → skipped silently, never queued; any other filter → queue `FILTERED` with the filter name, nothing downloaded.
2. Already linked (guild, 7TV emote) → skipped.
3. Download `4x.gif` (animated) / `4x.png` through `assertAllowedEmoteSourceUrl` + `getBufferFromUrl` (10 MB, 15 s, 2 attempts), normalize, read width / frame height. Failure → `FAILED` `download` / `invalid_file`.
4. Aspect ratio (long side / short side) over `maxAspectRatio` → `ASPECT_RATIO` with the ratio.
5. Free slot of the file's type (from the file, not 7TV's flag): `GET /guilds/:id` over REST (emojis + tier + features, not the shard cache), managed emojis not counted, `getEmojiSlotLimit` → `NO_SLOT` with `static`/`animated`.
6. `optimizeBuffer(buffer, { fitting })` → `TOO_LARGE` on `EmoteTooLargeError`.
7. Create the emoji with `parseDiscordRegexName(alias)`; Discord errors map to `NO_SLOT` (30008/30018), `TOO_LARGE` (50138/50045), `FAILED` `permissions` (50013/50001), `invalid_file` (50046), `discord` (others). Anything unexpected → `FAILED` `unknown:<error code>` (logged with `logErrorCode`).
8. Insert the link and drop the queue entry in one transaction.

Download and optimization results are cached in memory for 10 min (by file URL, and URL + fitting), so several servers syncing one channel optimize an emote once. Optimization runs in the manager like the API's, so a burst blocks the API for its duration.

### Decisions

- **Unlink** drops links and queue; the Discord emojis stay. Links are keyed by 7TV emote id, so stale links could let another channel's removals delete emojis after a relink. Linking a different channel does the same; relinking the same channel keeps both.
- **Pause** (`enabled: false`) keeps links and queue and unsubscribes (when no other server needs the set). Events while paused are lost.
- **Queue** has one entry per (guild, 7TV emote); a new failure updates it (reason, `queuedAt`). Freed slots never retry anything.
- **Moderator deletes**: the shard's `emojiDelete` handler drops the link (`dropSyncLinkForEmoji`, idempotent). Sync removals delete the link before calling Discord, so their own `emojiDelete` finds nothing; the existing removed-emotes record is still written (`deletedWithPanel: false`), so the panel can restore them.
- **Name regex**: case-insensitive, max 100 chars, tested on the first 100 chars of the name; patterns with a quantified group containing a quantifier (`(a+)+`) are rejected (they run on the manager's event loop).

### Settings

Stored as `jsonb` in `stv_sync_configs.settings`, validated by `syncSettingsSchema`; reads go through `readStoredSettings` (missing keys fall back to the defaults). Defaults:

```json
{
  "filters": {
    "includeStatic": true, "includeAnimated": true,
    "skipZeroWidth": true, "skipNsfw": true,
    "nameContains": [], "nameRegex": null,
    "excludedEmoteIds": [],
    "authors": { "mode": "block", "values": [] }
  },
  "optimization": { "maxAspectRatio": 2, "fitting": "contain" }
}
```

`nameContains` (≤ 50 words, 1–32 chars, case-insensitive, any one must match), `excludedEmoteIds` (≤ 1000 7TV ids), `authors.values` (≤ 100 7TV user ids or usernames; `allow` = only these, `block` = all but these), `maxAspectRatio` 1–8, `fitting` `contain` (keep the shape, transparent sides as Discord shows it) / `cover` (center crop) / `fill` (stretch). Zero-width = active flag `1` or emote flag `1<<8`; NSFW = emote flag `1<<16`.

### Tables

- `stv_sync_configs` (pk `guild_id`): Twitch id/login/display name, 7TV user id, active set id (null without one), `enabled`, `settings`, `linked_by` (Discord user id), timestamps.
- `stv_sync_links`: (guild, 7TV emote) unique → Discord emoji id, name, animated; index on the emoji id.
- `stv_sync_queue`: (guild, 7TV emote) unique; alias, animated, file and preview URL, width/height, author, `reason`, `detail`, `queued_at`.

### API

Under `/api/guilds/:guildId/sync`, every route `requireAuth` + `getManageableGuild` (read routes too: settings are admin data). Queue entries are loaded by id **and** guild. See [core.md](../core.md#api) for the shapes; codes: `404 SYNC_NOT_LINKED`, `404 QUEUE_ENTRY_NOT_FOUND`, `404 STV_USER_NOT_FOUND`, `404 CHANNEL_NOT_FOUND`, `502 UPSTREAM_ERROR`, `409 EMOTE_ALREADY_SYNCED`, plus the upload codes for add-after-edit.

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

### Flags (for filters)

- Active emote `flags` (per set): `1` = zero-width, `1<<16` / `1<<17` / `1<<18` = override Twitch global / Twitch subscriber / BTTV.
- Emote `data.flags`: `1` = private, `1<<1` = authentic, `1<<8` = zero-width by default, `1<<16` = sexual (NSFW), `1<<17` = epilepsy, `1<<18` = edgy, `1<<24` = Twitch disallowed. The current server only ever sets private, zero-width and sexual in v3 output.
- `data.animated` decides the slot type.

### Not verified yet

- No live add/remove dispatch was captured (it needs a 7TV account whose set we can change); the shapes above come from the server code. The parser follows them and accepts extra fields; the first live dispatches are logged raw (`[7TV-SYNC] dispatch …`), check them against this section. The active emote shape was checked against REST `GET /v3/users/twitch/<id>` (same v3 type): all 969 emotes of a big set parse.
- Unsubscribe (op 36 in the old README) isn't verified, so the client never sends it.
- No per-IP connection limit was found in the code (`connection_limit` is unset by default); the deployed value is unknown.
- Discord's rate limit on creating emojis isn't measured. Events come one at a time, so it matters only for bursts (a streamer adding many emotes at once).
