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

Adapters build it from API shapes: `fromGuildEmote` (`GET /guilds/:guildId`), `fromRemovedEmote` (`GET /guilds/:guildId/removed`), `fromTask` (`GET /tasks`). A new source (7TV browse) gets its own adapter there; nothing else changes.

## The menu belongs to the list

`EmoteMenu` (`src/components/emote/emote-menu.tsx`) wraps a list of emotes. It owns **one** ui-sdk `Menu` with a `createMenuController<PanelEmote>()`; each `Emote` is a `MenuContextTrigger` connected to that controller with its emote as the `payload`. So 500 tiles cost 500 small triggers and one menu, and a virtualized tile that unmounts doesn't take the menu with it.

Props (`EmoteListContext`): `kind` (`server` | `removed` | `task`), `guild` (`{ id, name }` the list belongs to), `canManage`, and `onOpen(emote)` for left click.

Per-emote UI state lives in `EmoteMenu`, keyed by `emote.key`, so it survives tiles scrolling out: the temporary fitting and the selection.

Actions by kind (`EmoteMenuItems`):

| Action | Shown |
|---|---|
| Restore to *server* | `removed`, with `canManage` |
| Add to server › | not on `task`. The user's manageable servers (sorted by name) with free slots of the emote's type; a full server stays listed but disabled; the emote's own server is marked "here". Sends `{ file: url, name, fitting }`. |
| Remove from *server* | `server`, with `canManage`; managed emotes show "Managed by an integration" instead |
| Temporary fitting › | not on `task`. contain / cover / fill: changes the tile preview and the `fitting` sent by Add to server |
| Copy name, Copy image link, Open original | always |
| Info › | always: name, type, source, file size (HEAD `Content-Length`, falls back to downloading; "unknown" without CORS), pixel size, id. Fetched only when the submenu opens (`["emote-file", url]`, cached forever). |

**Adding an action:** add a `MenuItem` (or `MenuSub`) in `EmoteMenuItems`, guarded by `kind`, `canManage` and the emote's fields, with an `onSelect` handler. Mutations go in `src/lib/emote-mutations.ts` as a hook returning a function that runs the request inside `toast.promise`. If a list needs a new combination of actions, add a `kind` rather than flags.

## Opening the menu

- Right click, long press on touch (ui-sdk's context trigger), the ContextMenu key (browser → `contextmenu`), and Shift+F10. Browsers turn Shift+F10 into `contextmenu` only on some platforms (not macOS), so `Emote` handles it itself with `controller.open({ payload, anchor, focus: "first" })` and prevents the key so it doesn't open twice.
- Focus returns to the tile on close; `finalFocus` gives up (`null`) when the tile is gone.
- Submenus open below their trigger under 640px (`MenuSubContent` in `components/ui/menu.tsx`): side by side they left the screen on a phone.

## Left click

Selects the emote (orange 2px inset outline, `aria-pressed`) and calls `onOpen`. Nothing passes `onOpen` yet: it's the hook for the emote detail dialog.

## Mutations and cache (`src/lib/emote-mutations.ts`)

- `useAddEmote()` → `POST /guilds/:id/emote`, then invalidates `["guilds"]` (slot meters) and `["guilds", targetId]`.
- `useRemoveEmote(guildId)` → optimistic: the emote leaves `["guilds", guildId]` and its slot count drops at once; an error restores the snapshot. Settled: invalidates the list and `["guilds", guildId, …]` (also refetches Removed).
- `useRestoreEmote(guildId)` → not optimistic (a restore re-uploads and can fail on size): the tile shows `pending` (dimmed + Spinner, `aria-busy`, no menu) until it settles, read with `useRestoringKeys` from the mutation cache so it survives remounts. Success drops it from the removed list and invalidates the server.
- `emoteErrorMessage(error)` maps `ApiError.reference` to a toast sentence (URL_NOT_ALLOWED, DOWNLOAD_DATA_FAILED, MISSING_PERMISSIONS, USER_NOT_IN_GUILD, OAUTH_GET_GUILDS_ERROR, INVALID_REQUEST_SCHEMA, GUILD_EMOTE_NOT_FOUND/EMOTE_NOT_FOUND, GUILD_EMOTE_DELETE_FAILED, RATE_LIMITED, and core's mapped Discord/size codes EMOTE_TOO_LARGE, GUILD_EMOJI_LIMIT_REACHED, BOT_MISSING_PERMISSIONS, INVALID_EMOTE_NAME, INVALID_EMOTE_FILE; unmapped DISCORD_API_ERROR shows Discord's message). See the error table in [core.md](../core.md).
- Names are cleaned for Discord with `toDiscordEmoteName` (2–32 of `[a-zA-Z0-9_]`).

## Virtualized grid

`EmoteGrid` (`src/components/emote/emote-grid.tsx`) renders a list of `Emote`s with `@tanstack/react-virtual`'s `useWindowVirtualizer`: the window is the panel's scroll container (router scroll restoration depends on it), so the grid's page offset is the `scrollMargin`, re-measured when the body resizes.

- Columns from the measured width (`useElementSize`): tiles at least 88px (72px under 480px wide), gap 4px; every row has the same height (tile + name line), so there's no per-row measuring, only `virtualizer.measure()` when the height changes. Overscan 3 rows.
- `<ul>` with absolutely placed `<li>`s (each has `aria-setsize`/`aria-posinset`, since most aren't in the DOM). 500 emotes keep about 100–140 tiles and ~600–800 elements mounted.
- One tab stop (roving tabindex): arrows (mirrored in RTL), Home/End within the row, Ctrl/Cmd+Home/End for the list. A move scrolls the target row in and focuses it after it renders. If the active tile is scrolled out, the first rendered tile takes the tab stop. When the focused tile disappears (removed), focus goes to whatever now holds the tab stop.

## Fitting preview

`contain` fits the emote into the square edge to edge, without padding (an inset preview was tried and rejected: uneven and wasteful); `cover`/`fill` fill the square edge to edge so the crop or stretch is visible, with an orange mono badge. Badges for `managed` / `unavailable` sit bottom left in muted mono.
