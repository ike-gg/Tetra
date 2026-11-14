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

Props (`EmoteListContext`): `kind` (`server` | `removed` | `task` | `catalog`), `guild` (`{ id, name }` the list belongs to; for `catalog`, the server to offer first), `canManage`, `onOpen(emote)` after a click selects, and `selectable` (default true; `false` makes left click do nothing and drops `aria-pressed`: Quick add's preview, whose form already is the actions, and the task editor's header tile, where a bar would only cover the editor).

Per-emote UI state lives in `EmoteMenu`, keyed by `emote.key`, so it survives tiles scrolling out: the temporary fitting and the selection. `useEmoteMenu()` exposes `fittingOf` / `setFitting`, so a control outside the menu (Quick add's fitting) shares the same state.

## Actions (`src/components/emote/emote-actions.tsx`)

`useEmoteActions(emote, context, fitting)` returns every action for an emote as data: `id`, `label` (plus `barLabel` / `compactLabel` for the bar), `type` (`run` with a `run()`, `link` with a TanStack `<Link />` element, `external` with an `href`, `add-to-server`, `note`), `variant` (`destructive`), `disabled` + `hint` (why), `section` (`main` | `file` | `share`, separators in menus) and `placement` in the bar (`primary` always a button, `bar` a button when there's room, `more` always in More). The context menu and the selection bar both render this one list, so an action added here shows up in both. `EmoteActionItems` renders actions as menu items (sections, then Temporary fitting › after `main` and Info › after `share`); the context menu passes all of them under a `:name:` label, the bar's More menu those without a button.

| Action | Shown | Bar |
|---|---|---|
| Open in editor | `task`: a `Link` to `/panel/editor/$taskId` | primary |
| Restore to *server* | `removed`, with `canManage` | primary ("Restore") |
| Add to *server* | `catalog` with a `guild`: that server (disabled with "static full" / "animated full") | primary |
| Add to server › / ▾ | not on `task`. The user's manageable servers (sorted by name) with free slots of the emote's type; a full server stays listed but disabled; the emote's own server is marked "here". Sends `{ file: url, name, fitting }` with `useAddEmote`. A submenu in menus, a dropdown in the bar. | primary on `server` and on a `catalog` without a preferred server, else a button |
| Remove from *server* | `server`, with `canManage`; managed emotes get the note "Managed by an integration" instead | button ("Remove", `destructive`, last) |
| Download | always | button |
| Edit in editor | not on `task` (tasks have the panel editor) | button |
| Temporary fitting › | not on `task`. contain / cover / fill: changes the tile preview and the `fitting` sent by Add to server | More |
| Copy name, Copy image link, Open original ↗ | always; Open original goes to `pageUrl` (the provider's page) when set, else the file | More |
| Info › | always: name, type, source, file size (HEAD `Content-Length`, falls back to downloading; "unknown" without CORS), pixel size, id. Fetched only when the submenu opens (`emoteFileQueryOptions`: `["emote-file", url]`, cached forever). | More |

**Adding an action:** push it in `useEmoteActions`, guarded by `kind`, `canManage` and the emote's fields, with a `placement` and `section`. Mutations go in `src/lib/emote-mutations.ts` as a hook returning a function that runs the request inside `toast.promise`. If a list needs a new combination of actions, add a `kind` rather than flags.

## Opening the menu

- Right click, long press on touch (ui-sdk's context trigger), the ContextMenu key (browser → `contextmenu`), and Shift+F10. Browsers turn Shift+F10 into `contextmenu` only on some platforms (not macOS), so `Emote` handles it itself with `controller.open({ payload, anchor, focus: "first" })` and prevents the key so it doesn't open twice.
- Focus returns to the tile on close; `finalFocus` gives up (`null`) when the tile is gone.
- Submenus open below their trigger under 640px (`MenuSubContent` in `components/ui/menu.tsx`): side by side they left the screen on a phone.

## Selection

- **Model** (`emote-selection.ts`): one selection in the whole panel, a small external store (`useSyncExternalStore`) holding the owning `EmoteMenu`'s id (`useId`) and a list of `PanelEmote`s. Selecting in another list replaces it. It's a list so Shift/Cmd+click can add to it later; today it holds at most one and the bar shows the first.
- **Select / deselect**: left click or Enter/Space on a tile selects it (orange 2px ring, `aria-pressed`) and calls `onOpen`; clicking the selected tile again, Esc on a tile, Esc in the bar or the bar's × deselect. The ring is a border on an overlay span above the preview, as is the keyboard focus ring: an outline on the button hid under the preview on tiles without padding (task tiles).
- **Lifetime**: lists call `syncSelection(emotes)` with what they show (`EmoteGrid` does it; `TaskList` too), which drops selected emotes no longer there and takes their fresh objects. So a removed or restored emote, a filtered-out one, a new Browse query or a fixed task closes the bar. The menu clears its selection when it unmounts (route change) or its `kind` changes (Emotes ↔ Removed).
- Screen readers: a polite `role="status"` line in `EmoteMenu` says "Selected X. Its actions follow the list." / "Selection cleared."

## Selection bar (`emote-selection-bar.tsx`)

Rendered by the owning `EmoteMenu` while it has a selection (keyed by the emote, so menus start closed).

- **Place**: `fixed` at the bottom of the content area: `left: var(--panel-inset)` (the sidebar's width where it shows, see [web.md](../web.md#panel-layout)), full width on phones; `h-14`, `bg-surface`, top hairline, z-30. Contents are aligned with the content column (`max-w-5xl`). No motion: it appears and goes instantly, like the selection ring (tens of times a day, control feedback; branding.md).
- **Left**: 40px preview on `bg-checker`, the name (selectable text), a mono line: source · static/animated · managed/unavailable · pixel size (measured, else the source's) · file size (the same `emoteFileQueryOptions` as Info, fetched on selection), and the fitting in orange when not contain.
- **Right**: a ui-sdk `Toolbar` (one tab stop, arrows between buttons; menu triggers through `ToolbarButton render={<MenuTrigger />}`, Down opens them, menus open upward). Buttons by `placement`; More ▾ (secondary) with the rest; × "Clear selection". web.css draws the toolbar as a bordered, padded, wrapping box, so it's pinned flat (`border-0 p-0 flex-nowrap`).
- **Narrow**: the bar measures itself (`useElementSize`; actions render only once measured, so there's no wide→narrow flash). Under 760px only the primary action stays a button and everything else moves into More; under 480px the primary takes its `compactLabel` ("Add", "Add here", "Open") with the full name as `aria-label`.
- **Not covering content**: main's 64px bottom padding already clears the 56px bar; `html:has([data-selection-bar])` sets `scroll-padding-bottom` (focus and scrollIntoView stop above it) and `EmoteGrid` passes `scrollPaddingEnd` to the virtualizer while something is selected, so arrow keys never land on a row under the bar. The `Toaster` moves up above it.
- **Keyboard**: selecting keeps focus in the grid; the bar comes right after the list in the DOM, so Tab reaches it. Esc in the bar deselects (an open menu handles its own Esc first, `defaultPrevented`). When the bar closes with focus inside (Esc, ×, or its emote removed from the bar), focus goes back to the tile, or, if the tile is gone, to its list's tab stop (`[data-emote][tabindex="0"]`, the list remembered per tile in a `WeakMap`).

## Files: download, edit in editor

`src/lib/emote-file.ts`. Both fetch `emote.url` (Discord: the CDN link without `?size`, so the original size) and name the file `<name>.<gif|png|webp|jpg>` from the response's content type (the URL's extension as fallback).

- **CORS, verified 2026-11** from `http://localhost:*`: `cdn.discordapp.com` (emojis, `*`), `cdn.7tv.app` (`*`), `cdn.frankerfacez.com` (`*`) can be read. `cdn.betterttv.net` sends no `Access-Control-Allow-Origin`, so BTTV files (removed or task emotes from BTTV) can't be read; link sources depend on their host. A CORS failure and a network error look the same to `fetch` (a `TypeError`), so both count as "can't read" (`EmoteFileUnreadableError`).
- **Download**: `toast.promise` (Downloading… → "Downloaded catJAM.gif"), saved with `downloadBlob`. Unreadable: opens the file in a new tab and says so ("BTTV doesn't let the browser read this file. Save it from there."); if the popup is blocked (the click's activation can expire while fetching), the toast has an Open action instead.
- **Edit in editor**: fetches the file, loads it with the editor's `loadMediaFile` (validates it) and `saveToLibrary` (both imported lazily, so the panel doesn't ship the editor's model), then navigates to `/editor/$key`. Unreadable sources get an error toast asking to download it and drop it into the editor; there's no proxy for them.

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
