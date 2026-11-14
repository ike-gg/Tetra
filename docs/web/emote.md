# Emote component

How the panel shows emotes. Paths are relative to `apps/web`.

## One component, one model

Every emote in the panel (server grid, removed list, task tiles, later browse lists and dialogs) is shown with `Emote` (`src/components/emote/emote.tsx`). Never render an emote `<img>` by hand: right-click actions, selection and fitting hang off this component.

`Emote` takes a `PanelEmote` (`src/lib/emote.ts`), the normalized shape of an emote whatever API it came from:

| Field | Meaning |
|---|---|
| `key` | Unique within a list (`discord:<id>`, `removed:<restoreId>`, `task:<taskId>`, `stored:<rowId>`). React key, menu payload, key of per-emote UI state. |
| `id` | Id at the source (Discord emoji id, 7TV id…). |
| `name`, `animated` | |
| `previewUrl` | Small image for tiles (Discord: `imageURL?size=128`). |
| `url` | Full-size file: what "Add to server" sends as `file` and "Open original" opens. Discord's `cdn.discordapp.com` is on core's allowed source hosts. |
| `source` | `discord` · `7tv` · `bttv` · `ffz` · `twitch` · `link` (`SOURCE_LABELS` for display). |
| `guildId?` | Server it's on, was removed from, or a task belongs to. |
| `managed?`, `available?` | Discord flags: integration emotes can't be removed; unavailable = over the slot limit after a lost boost. |
| `restoreId?` | Removed emotes: the id `POST /guilds/:guildId/restore/:restoreId` takes. |
| `taskId?` | Task emotes: the editor task "Open in editor" opens (`/panel/editor/$taskId`). |
| `pageUrl?` | Catalog emotes: the emote's page on 7TV / BTTV / FFZ; "Open original" prefers it over `url`. |
| `width?`, `height?` | Pixel size when the source states it (catalog emotes). |

Adapters build it from API shapes: `fromGuildEmote` (`GET /guilds/:guildId`), `fromRemovedEmote` (`GET /guilds/:guildId/removed`), `fromTask` (`GET /tasks`), `fromCatalogEmote` (`GET /emotes/resolve` and Browse's searches from `lib/providers/`; key `<source>:<id>`). A new source gets its own adapter there; nothing else changes.

## The menu belongs to the list

`EmoteMenu` (`src/components/emote/emote-menu.tsx`) wraps a list of emotes. It owns **one** ui-sdk `Menu` with a `createMenuController<PanelEmote>()`; each `Emote` is a `MenuContextTrigger` connected to that controller with its emote as the `payload`. So 500 tiles cost 500 small triggers and one menu, and a virtualized tile that unmounts doesn't take the menu with it.

Props (`EmoteListContext`): `kind` (`server` | `removed` | `task` | `catalog`), `guild` (`{ id, name }` the list belongs to; for `catalog`, the server to offer first), `canManage`, `onOpen(emote)` for left click, and `selectable` (default true; `false` makes left click do nothing and drops `aria-pressed`, used by Browse).

Per-emote UI state lives in `EmoteMenu`, keyed by `emote.key`, so it survives tiles scrolling out: the temporary fitting and the selection. `useEmoteMenu()` exposes `fittingOf` / `setFitting`, so a control outside the menu (Quick add's fitting) shares the same state.

Actions by kind (`EmoteMenuItems`):

| Action | Shown |
|---|---|
| Open in editor | `task`: a `Link` to `/panel/editor/$taskId` |
| Restore to *server* | `removed`, with `canManage` |
| Add to *server* | `catalog` with a `guild`: one item for that server (disabled when its slots of the type are full) |
| Add to server › | not on `task`. The user's manageable servers (sorted by name) with free slots of the emote's type; a full server stays listed but disabled; the emote's own server is marked "here". Sends `{ file: url, name, fitting }`. |
| Remove from *server* | `server`, with `canManage`; managed emotes show "Managed by an integration" instead |
| Temporary fitting › | not on `task`. contain / cover / fill: changes the tile preview and the `fitting` sent by Add to server |
| Copy name, Copy image link, Open original | always; Open original goes to `pageUrl` (the provider's page) when set, else the file |
| Info › | always: name, type, source, file size (HEAD `Content-Length`, falls back to downloading; "unknown" without CORS), pixel size, id. Fetched only when the submenu opens (`["emote-file", url]`, cached forever). |

**Adding an action:** add a `MenuItem` (or `MenuSub`) in `EmoteMenuItems`, guarded by `kind`, `canManage` and the emote's fields, with an `onSelect` handler. Mutations go in `src/lib/emote-mutations.ts` as a hook returning a function that runs the request inside `toast.promise`. If a list needs a new combination of actions, add a `kind` rather than flags.

## Opening the menu

- Right click, long press on touch (ui-sdk's context trigger), the ContextMenu key (browser → `contextmenu`), and Shift+F10. Browsers turn Shift+F10 into `contextmenu` only on some platforms (not macOS), so `Emote` handles it itself with `controller.open({ payload, anchor, focus: "first" })` and prevents the key so it doesn't open twice.
- Focus returns to the tile on close; `finalFocus` gives up (`null`) when the tile is gone.
- Submenus open below their trigger under 640px (`MenuSubContent` in `components/ui/menu.tsx`): side by side they left the screen on a phone.

## Left click

Selects the emote (orange 2px inset outline, `aria-pressed`) and calls `onOpen`. The server lists don't use `onOpen` yet (the hook for an emote detail dialog). Browse turns it off (`selectable={false}`): a click there does nothing until the owner's plan for it lands; opening Quick add with the clicked emote was tried and removed.

## Mutations and cache (`src/lib/emote-mutations.ts`)

- `useAddEmote()` → `POST /guilds/:id/emote`; on success the target's slot count goes up at once (see [Slot counts](#slot-counts)), then the server refreshes. The returned function resolves to whether it worked (never rejects; the toast already reported it), so Quick add clears its field only after the server took the emote.
- `useRemoveEmote(guildId)` → optimistic: the emote leaves `["guilds", guildId]` and its slot count drops at once in both caches (not for managed emotes); an error restores both snapshots. Settled: `refreshSlotCounts` (also refetches Removed).
- `useRestoreEmote(guildId)` → not optimistic (a restore re-uploads and can fail on size): the tile shows `pending` (dimmed + Spinner, `aria-busy`, no menu) until it settles, read with `useRestoringKeys` from the mutation cache so it survives remounts. Success drops it from the removed list and moves the slot count up, then the server refreshes.
- `emoteErrorMessage(error)` maps `ApiError.reference` to a toast sentence (URL_NOT_ALLOWED, DOWNLOAD_DATA_FAILED, MISSING_PERMISSIONS, USER_NOT_IN_GUILD, OAUTH_GET_GUILDS_ERROR, INVALID_REQUEST_SCHEMA, GUILD_EMOTE_NOT_FOUND/EMOTE_NOT_FOUND, GUILD_EMOTE_DELETE_FAILED, RATE_LIMITED, and core's mapped Discord/size codes EMOTE_TOO_LARGE, GUILD_EMOJI_LIMIT_REACHED, BOT_MISSING_PERMISSIONS, INVALID_EMOTE_NAME, INVALID_EMOTE_FILE; the task codes PAYLOAD_TOO_LARGE, TASK_NOT_FOUND, FILE_TOO_LARGE, UNSUPPORTED_FILE_TYPE; unmapped DISCORD_API_ERROR shows Discord's message). See the error table in [core.md](../core.md).
- Names are cleaned for Discord with `toDiscordEmoteName` (2–32 of `[a-zA-Z0-9_]`, core's `EMOTE_NAME_REGEX`): a valid name stays as is, runs of other characters become one `_`, edge underscores they leave are dropped (`cat-JAM:v2!` → `cat_JAM_v2`). `isDiscordEmoteName` checks a name the user typed.

## Slot counts

Every slot display reads two caches: the server list `["guilds"]` (`emojis.static|animated`: Home tiles, Quick add's "N free" rows, Add to server ›'s rows, the task editor's "no free slots" notice, the server header until its details load) and the server's details `["guilds", id]` (`stats`: the server header). The sidebar shows no counts. `src/lib/guild-slots.ts` keeps them in step.

- **The race**: `GET /guilds` counts come from the bot's gateway cache (`broadcastEval`), which learns about a change from Discord's GUILD_EMOJIS_UPDATE event, often after the REST call that made it has answered. Refetching the list right after an add/remove/restore could bring the old count back over a correct one. `GET /guilds/:id` reads Discord's REST API and is accurate at once.
- **The fix**: on success of an add (`useAddEmote`, Quick add and the menu's Add to server both use it), a restore, or a task's add (`useAddTaskEmote`), `holdSlotCounts` cancels fetches in flight and `shiftSlotCounts` moves the count by 1 in both caches; a remove does the same in `onMutate` and rolls both back on error. The type comes from the response's `preview` (Discord CDN link, `.gif` only for animated), since optimizing may change it. Then `refreshSlotCounts` refetches the details now and invalidates the list 3 s later; each change pushes that timer back, so a burst ends with one list refetch. In the meantime the list stays fresh by itself (`setQueryData` resets its age, default `staleTime` 30 s), so a window focus doesn't refetch it early.
- A gateway slower than 3 s would still bring a stale count back with that one refetch, until the next one. Verified 2026-11 with a mock whose `/guilds` lagged 2 s: counts moved at once on the server page, Home and Quick add, and the delayed refetch didn't revert them.

## Virtualized grid

`EmoteGrid` (`src/components/emote/emote-grid.tsx`) renders a list of `Emote`s with `@tanstack/react-virtual`'s `useWindowVirtualizer`: the window is the panel's scroll container (router scroll restoration depends on it), so the grid's page offset is the `scrollMargin`, re-measured when the body resizes.

- Columns from the measured width (`useElementSize`): tiles at least 88px (72px under 480px wide), gap 4px; every row has the same height (tile + name line), so there's no per-row measuring, only `virtualizer.measure()` when the height changes. Overscan 3 rows.
- `<ul>` with absolutely placed `<li>`s (each has `aria-setsize`/`aria-posinset`, since most aren't in the DOM). 500 emotes keep about 100–140 tiles and ~600–800 elements mounted.
- `onEndReached` (infinite lists): called while the rendered rows include one of the last 4, about 6 rows before the end with overscan 3, and again after a page lands if the end is still that close. The caller guards it with `hasNextPage` / `isFetchingNextPage`.
- One tab stop (roving tabindex): arrows (mirrored in RTL), Home/End within the row, Ctrl/Cmd+Home/End for the list. A move scrolls the target row in and focuses it after it renders. If the active tile is scrolled out, the first rendered tile takes the tab stop. When the focused tile disappears (removed), focus goes to whatever now holds the tab stop.

## Fitting preview

`contain` fits the emote into the square edge to edge, without padding (an inset preview was tried and rejected: uneven and wasteful); `cover`/`fill` fill the square edge to edge so the crop or stretch is visible, with an orange mono badge. Badges for `managed` / `unavailable` sit bottom left in muted mono.
