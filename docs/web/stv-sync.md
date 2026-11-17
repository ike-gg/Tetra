# 7TV channel sync (panel)

The panel side of core's experimental 7TV sync ([../core/7tv-sync.md](../core/7tv-sync.md): scope, API, reasons). Paths are relative to `apps/web`.

## Where it lives

- **Route** `/panel/servers/$guildId/sync` (`routes/panel.servers.$guildId_.sync.tsx`). The `_` suffix makes it a sibling of the server route under `/panel`, not its child: the server page has no outlet. Same guild check as the server page (manageable servers only, inline "server not found" otherwise). Header crumb `panel / <server> / 7TV sync` (the server crumb links back, hidden below `sm`). Not a `?view=` tab of the server page: the emotes toolbar (filter, type, sort) doesn't apply to setup, settings and a queue of emotes that aren't on the server.
- **Way in**: `StvSyncTile` next to the slot meters on the server page: "following <channel>" / "paused on <channel>" / a setup line, the queue count in orange, "manage" / "set up". Hidden when the sync isn't available and nothing is linked, or while its query loads or fails. Its query doesn't poll.
- **Components** (`components/panel/`): `stv-sync.tsx` (`StvSync` page body, status, link form, `StvSyncTile`), `stv-sync-queue.tsx`, `stv-sync-settings.tsx`, `unlink-sync-dialog.tsx` (ui-sdk alert dialog, as `DiscardTaskDialog`).
- **Data** (`lib/stv-sync.ts`): `syncQueryOptions(id)` (`["stv-sync", id, "state"]`) and `syncQueueQueryOptions(id)` (`["stv-sync", id, "queue"]`), both refetched every 30 s while shown (connection state, counts and new queue entries change on their own); `syncKey(id)` invalidates both. Types come from the client (`SyncState`, `LinkedSync`, `SyncSettings`, `QueueEntry`). `syncErrorMessage` handles the sync codes and falls back to `emoteErrorMessage`; `connectionStatus` turns `connection` + `sync` into one line. The own key root keeps them out of `["guilds"]` invalidations.
- **Writes** (`lib/stv-sync-mutations.ts`): every state-returning write puts the answer into the state query and invalidates `syncKey`, so the queue and counts refetch after any write.

## What the user sees

- Header: server icon, "7TV sync" with a `Badge tone="signal"` "experimental" (the view's one signal element), a `← <server>` link, and a `Notice` "experimental: this may behave unpredictably" explaining events-only.
- `available: false`: "the 7TV sync isn't active on this tetra instance", no setup. With a channel still linked, the status box, queue and settings stay (status "off on this tetra instance"), so it can be unlinked.
- Not linked: `ChannelSearch` (the channels page's autocomplete); choosing a channel sends `PUT { login }` at once, "linking <login>" while it runs, errors inline.
- Linked: channel display name (login when it differs), linked time, "open on 7TV ↗", unlink (confirm says the emotes stay, links and queue go); status (orange square when connected and following the set, `Spinner` while connecting, grey otherwise; "paused", "no active 7TV set" win), synced and queued counts; "sync new emotes" `Switch` = `PATCH { enabled }`, showing the requested value while it runs.
- **Queue**: rows with the 2x preview on `bg-checker`, `:discordName:` (the 7TV alias when it differs), type · size · author · relative time, the API's `message` as is. Retry (toast: added / "still in the queue" with the new message as a plain toast, not an error / already synced), open in editor (see [editor.md](editor.md#7tv-sync-queue-target)), dismiss ▾ (`dismiss` / `dismiss and never sync it` = `?exclude=true`). A line above says freed slots never retry on their own and retry skips filters.
- **Settings**: one form, one save; resets when the saved settings change. Switches for the four booleans, comma-separated `name contains` and authors (with a block/allow `SegmentedControl`), name pattern with `/…/i` affixes, the max aspect ratio `Slider` (1–8, 0.25 steps, `N:1`), shape via the editor's `FittingPicker`. Limits and regex syntax are checked inline (`SETTINGS_LIMITS`, `nameRegexError`); core's own nested-quantifier rejection arrives as 400 `INVALID_REQUEST_SCHEMA` and is explained under the button. Excluded emote ids aren't in the form: a count with "clear", saved on its own from the stored settings, so it never discards a draft. "discard changes" and "reset to defaults" (the API's `defaults`, applied to the form, not saved).
- Filters queue an emote (`FILTERED`), they never drop it; the copy says so.

## Not verified

Built against the API types only; no browser check, no live 7TV events.
