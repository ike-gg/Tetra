# Editor

Paths in this document are relative to `apps/web`. Overview of the web app: [../web.md](../web.md). UI rules: [../branding.md](../branding.md).

The Image/GIF quick editor: GIFs and still images (PNG, JPEG, WebP). Named for both on purpose, it's not an emote editor or a GIF tool only. "Image/GIF quick editor" is its full name (page title, eyebrow on `/editor`); everywhere else, breadcrumbs included, it's just "Editor". In code it's the media editor (`components/editor/media-*`). It's built around Discord emotes (the size meter measures against Discord's 256 KB emote limit, the same on every server), but works for any image. Everything runs locally in the browser.

One editor, two hosts (the public site and the panel) sharing one local library, and the task editor:

- **`/editor`** – public, no account, nothing uploaded. Prerendered start screen, content from the top (not centered): intro, drop zone (`MediaDropzone`: drop anywhere on the page, paste, or pick; GIF/PNG/JPEG/WebP, up to 20 MB; `/editor` imports `ui-sdk.css` too and the zone pins width, border style, font size, colors and the trigger margin, because web.css stays global once any editor route loaded it and used to change the zone between visits) and *recently edited* (`RecentFiles`). A chosen file is validated, saved to the local library and opened at `/editor/<key>`, so Back returns to `/editor`. Routes: `editor.index.tsx` (head) + `editor.index.lazy.tsx`; everything under the intro is `EditorStart host="public"`.
- **`/editor/$key`** – client-only. Loads the file and its saved settings from the library and opens the editor; the toolbar has `New file` (back to `/editor`), [Add to server](#add-to-server) when the user has a session, and `Download` (always enabled once a result exists, file named `<name>.<extension of the result>`; the size note says Discord takes up to 256 KB). Below `sm` the toolbar keeps only `tetra / Editor`, Add to server and Download (the name field shows the name, the `Editor` crumb is New file): with all of it the header was wider than a 390px phone already before Add to server. An unknown key (other browser, evicted, cleared) shows "This file isn't in this browser" with a way back. Routes: `editor.$key.tsx` + `editor.$key.lazy.tsx`, rendering `LibraryEditor host="public"`.
- **`/panel/editor`**, **`/panel/editor/$key`** – the same two screens inside the panel layout (`host="panel"`), listing and opening the same library files. See [Panel integration](#panel-integration).
- **`/panel/tasks/$taskId`** – a bot task's emote inside the panel layout, with "Add to <server>" instead of Download. See [Panel integration](#panel-integration).

## Files

| Path | Role |
|---|---|
| `routes/editor.index.tsx`, `editor.index.lazy.tsx` | `/editor` start screen (prerendered): intro, drop zone, recent files. |
| `routes/editor.$key.tsx`, `editor.$key.lazy.tsx` | `/editor/<key>` (client-only): file from the local library, saves settings, Download. |
| `routes/panel.editor.index.tsx`, `panel.editor.$key.tsx`, `.lazy.tsx` | `/panel/editor` and `/panel/editor/<key>`: the same start screen and library editor inside the panel. |
| `components/editor/editor-host.ts` | `EDITOR_HOSTS`: per host (`public`, `panel`) its start route, file route and the Discord emote default. |
| `components/editor/editor-start.tsx` | `EditorStart`: drop zone, validate + save to the library, open in the host's file route; recent files. |
| `components/editor/library-editor.tsx` | `LibraryEditor`: a library file in `MediaEditor` for either host: load and missing states, saving settings, New file, Download. |
| `components/editor/use-media-file.ts` | `useMediaFile(blob, fileName)`: a blob as an editor source (also used by the task editor). |
| `lib/media/library-file.ts` | `libraryFileQueryOptions(key)`: one library file + saved settings, shared by the editor page and the panel's breadcrumb. |
| `routes/panel.tasks.$taskId.tsx`, `.lazy.tsx` | `/panel/tasks/<taskId>`: task + proxied file, load states, Add to server, Discard. |
| `components/editor/media-editor.tsx` | The editor screen: edit state, sidebar, auto-fit, first-render overlay. Pages pass actions, size note, initial work, `onWorkChange`. |
| `components/editor/canvas-window.tsx` | Workspace with the movable, resizable, remembered window. |
| `components/editor/media-preview.tsx` | Original / result panes, Fit / Actual size, crop outline, chat preview. |
| `components/editor/media-cropper.tsx` | ui-sdk `ImageCropper` fitted into the window. |
| `components/editor/fitting-picker.tsx` | Contain / Cover / Fill control with icons (Crop toolbar), `FITTING_LABELS`. |
| `components/editor/trim-timeline.tsx` | Trim slider over the film strip; commits on release. |
| `components/editor/media-dropzone.tsx` | Drop / paste / pick, accepted types, 20 MB cap. |
| `components/editor/recent-files.tsx` | "Recently edited" list on both start screens; links into the host's editor. |
| `components/editor/use-media-render.ts`, `use-film-strip.ts` | Rendering the latest edit; GIF film strip. |
| `lib/media/` | `media-file.ts` (load, sniff, names), `edit.ts` (model, defaults, fitting math, auto-fit ladder), `render.ts` (engine switch), `local-library.ts` (IndexedDB). |
| `lib/gif/` | `parse-gif.ts`, `gifsicle.ts` (worker runner), `gif-commands.ts`. |
| `lib/image/` | `render-image.ts` (worker runner), `image-worker.ts` (jSquash pipeline). |
| `lib/latest-task.ts`, `lib/use-element-size.ts`, `lib/download-blob.ts`, `lib/relative-time.ts`, `lib/format-bytes.ts` | Small shared helpers. |
| `types/gifsicle-wasm-browser.d.ts` | Types for the untyped gifsicle package (only `tool.worker()`). |

## Screen

`src/components/editor/media-editor.tsx` holds the edit state; pages pass the toolbar actions and an optional size note as render props. The actions get `MediaEditorState`: `discord`, `name`, `nameValid`, `result`, `pending` (a newer render is running), `fits`. Host options: `section` (the breadcrumb; leave it out when the host has its own header, then `toolbarStart` fills that spot and the first-render overlay covers only the editor, card at the top), `notice` (bars under the toolbar), `discordOnly` (checks on, switch hidden), `initialDiscord`, `outputFormats` (what a still image may become; in Discord emote mode only `EMOTE_FORMATS`, PNG and WebP, of them), `className` (height; full viewport by default).

- **Large file notice**: files over 5 MB (`LARGE_FILE_BYTES` in `lib/media/media-file.ts`) open normally, with a `Notice` bar under the toolbar saying the editor is made for smaller files, processing may be slow or fail, and a dedicated tool will do better. `Continue anyway` hides it. The hard upload limit is 20 MB (`MAX_FILE_BYTES` in `media-dropzone.tsx`).
- **First render blocks the editor**: until the first result exists, a `ProcessingOverlay` (`Spinner` + "Processing" + file name, plus "<size> is a big file, this can take a while." over 5 MB) covers the screen and the editor is `inert`. Later renders don't block (see below).
- **Toolbar**: breadcrumb (`tetra / <section> / <name>`, the section links back to `/editor` or `/panel`), `Reset`, page actions.
- **Layout** (desktop, `lg`): the page never scrolls. The header, the view toolbar and the trim bar are fixed; the sidebar scrolls on its own; the workspace takes the rest. Below `lg` the columns stack and the page scrolls, the workspace is 60vh.
- **Workspace** (`canvas-window.tsx`): a `bg-dots` area that never scrolls, holding one window. Drag its title bar to move it (pointer capture, 1:1 with the grab offset, at least 64 px stay on screen), drag the bottom-right corner to resize it (min 320×240). The chosen position and size are saved in `localStorage` (`tetra:editor-window`, per browser, not per file) when a drag ends, and restored clamped to the workspace; the saved choice itself is never overwritten by clamping, so the window grows back when the browser window does. Without a saved choice it follows the workspace. `Fit window` or a double-click on the title bar puts it back to fill the workspace and forgets the choice. Storage errors (private mode) just mean it starts fitted. Its content gets the body size and fits itself to it.
- **Main area**, `Preview | Crop`:
  - *Preview*: original and real result in two equal panes (stacked when the window is narrower than 520 px), on `bg-checker`. A `Fit | Actual size` toggle sets the scale: *Fit* (default) fits both into their pane, so lowering Size shows up as lost detail instead of a smaller picture, with `image-rendering: pixelated` whenever an image is scaled up; *Actual size* shows 1:1 CSS pixels and larger images scroll inside their pane (centered with `m-auto`, so they still scroll from their edge). Images get `max-w-none`: Tailwind's preflight `max-width: 100%` would otherwise squash them. The original outlines the area that ends up in the result (crop and fitting) and dims the rest. The result's caption shows frames for GIFs and the output format for images. While a newer result renders, the old one stays, dimmed, and the title says "updating". With *Discord emote* on, the result pane ends with an "in chat" row (22 px inline, 48 px jumbo).
  - *Crop*: ui-sdk `ImageCropper` fitted into the window, image scaled with `image-rendering: pixelated`. The viewport has padding and the selection `z-10`: with `overflow: hidden` and no padding, a selection covering the whole image lost its outline and handles at the edges. The preview's crop outline is drawn inside its box (`-outline-offset-1`) for the same reason. The toolbar shows the Fitting control (compact) and `Remove crop`; the window title explains what the selection means for the current fitting. A crop covering the whole image is stored as `null`.
  - *Trim* (animated GIFs only): two-thumb slider over a film strip of 16 frames, in **frame indices** (frames can have different delays), labels in seconds. Handles, dimming and times follow a drag live from a local draft; the edit (and so the render) changes only on release (`onValueCommit`, also once per key press), because every render of a long GIF is a full gifsicle run.
- **Inspector**:
  - *output*: a **Discord emote** switch (off by default on `/editor`, on by default on `/panel/editor`, saved with the file's settings; always on and hidden in the task editor). Emote mode leaves JPEG out of the formats (core's upload endpoints reject it); a saved JPEG choice shows and renders as Auto there and comes back when the switch goes off. A new file's name starts as `toDiscordEmoteName` of the file name ("emote" when nothing usable is left), valid in both modes. On: `Emote name` with `:name:` and Discord's rules (2–32 letters/numbers/`_`), the `SizeMeter` against 256 KB with `Fit automatically`, the size note and the chat preview. Off: `File name` with the result's extension as suffix (only characters file systems reject are refused) and a plain size summary (`original → result · −64%`). The name is the download's file name either way.
  - *adjust*, the options:

| Option | GIF | Still image |
|---|---|---|
| Format | – (stays GIF) | `Auto \| PNG \| WebP \| JPEG`, with a one-line hint; Auto names the format it picked |
| Size | longest side, never upscales | same |
| Fitting | `Contain \| Cover \| Fill`, tied to the crop (below) | same |
| Frame rate, Speed | animated only | – |
| Colors | `--colors` | – |
| Compression | `--lossy` | 0 = lossless; disabled for PNG |
| Trim empty edges | `--crop-transparency` | transparent border cut in the worker |

**Fitting** (only in the Crop view's toolbar, next to the crop it changes) decides how the crop becomes the result. The sidebar's *frame* section only summarizes it (crop size, fitting, result size) with a note and a button that toggles the view: `Edit in Crop`, then `Exit Crop mode` (back to Preview). It works like the bot's (`apps/core` `optimizeBuffer`: `transform: "center"` = cover, `"square"` = fill) but is tied to the crop, so the person always sees what stays:

- *Contain* – the crop as is, its shape kept.
- *Cover* – a square crop, nothing distorted. Switching to it sets the crop to the middle square of the current crop (`squareInside`), and the cropper locks to a square the person can move and resize. Switching away restores the crop from before (kept for the session).
- *Fill* – the (free) crop squeezed into a square whose side is its longer side, capped by Size (`--resize SxS` for GIFs, a `stretch` resize in the image worker). The bot stretches to the height instead; we use the longer side so nothing is squashed below its detail.

Each option has a small icon (the same wide frame and what happens to it); the result size in the summary comes from `predictDimensions` (may differ slightly with *Trim empty edges*). `effectiveCrop` still squares a non-square crop under *cover* for older saved edits. Verified on a 128×80 GIF with the WASM build: contain 128×80, cover 80×80 (crop `24,0+80x80`), fill 128×128.

Settings start at the original (full size, no compression): the editor isn't only for emotes, and `Fit automatically` is one click away.

## Local library (`src/lib/media/local-library.ts`)

Optional convenience, all in this browser's IndexedDB (database `tetra-editor`, stores `entries`, `files`, `edits`):

- **Key**: the file name made URL-safe (`Cat JAM!!.gif` → `cat-jam`), a 6-character random id when nothing is left (`🙂.png`). Another file with a taken name gets `-2`, `-3`. The same file again (SHA-256 of its bytes) reopens its entry and its settings instead of adding a copy.
- **Stored**: the original file, a 96 px PNG thumbnail (first frame for GIFs, so the list never loads originals) and metadata in `entries`; the editor's settings, name and Discord toggle in `edits`, saved 400 ms after the last change. Nothing is saved until something changes, so an untouched file opens with the host's default mode (off on `/editor`, on on `/panel/editor`); once edited, the file keeps its own mode in both hosts. **Results are never stored**, they're re-rendered from the settings. `restoreEdit` fills in settings added since and keeps the trim inside the file.
- **Limit**: the 10 most recently opened files; older ones are deleted with everything they stored. `Remove` in the list deletes one.
- **Shared by both hosts**: `/editor` and `/panel/editor` list the same files; a file opened in one shows up in the other's recent list, with its saved settings.
- **From the panel**: "Edit in editor" on an emote (menu or selection bar, `useEditInQuickEditor` in `lib/emote-file.ts`) fetches the full-size file, saves it here like a dropped file (`<name>.<ext>`) and opens `/panel/editor/<key>`, so the user stays in the panel; Back returns to where they were.
- **Reading a file**: `libraryFileQueryOptions(key)` (`["library-file", key]`, `staleTime` infinite, `gcTime: 0`): the editor page and the panel's breadcrumb share one read, and leaving the page drops it, so the next visit reads the settings saved meanwhile instead of a cached copy.
- **Without IndexedDB** (private mode, blocked storage) files live in memory for the visit, so the editor still works, just without history.
- Safari deletes script-writable storage after 7 days without a visit, so "recent" really means recent there. We don't call `navigator.storage.persist()`: Firefox shows a permission prompt for it.
- Checked with `bun test` against `fake-indexeddb` (keys, dedupe, suffixes, settings round-trip, the 10-file limit, remove).

## Processing

`src/lib/media/` is shared: `media-file.ts` loads a file (`loadMediaFile` sniffs the bytes, so a GIF stays a GIF whatever its extension; still images are measured with `createImageBitmap`), `edit.ts` holds the edit model, defaults and `reduceStep`, and `render.ts` has `renderMedia(source, edit, signal)`, which picks the engine and returns a `MediaRender` (blob, object URL, size, info, extension, format label).

`reduceStep` is the auto-fit ladder. GIF: compression to 60, frame rate down to 12, colors to 64, compression 100, then size down to 48. Image: compression to 60 (Auto then switches to a lossy format), PNG to Auto, then size down to 48. `Fit automatically` runs it with real renders until the result fits, then applies the settings; any manual change aborts it.

`use-media-render.ts` renders through `createLatestTask` (`src/lib/latest-task.ts`): every edit aborts the run in flight (its worker is terminated) and starts a new one, and each run carries a version, so a result that still arrives after a newer request is discarded (and its object URL revoked) instead of replacing the newer one. The UI is never locked; during a continuous drag results arrive once the input pauses for as long as one run takes. Errors of aborted runs are ignored. `use-film-strip.ts` (GIFs only) extracts the strip once per file with `--explode` (outputs are `frame.gif.NNN`, sorted numerically).

### GIF engine (`src/lib/gif/`)

[gifsicle](https://www.lcdf.org/gifsicle/man.html) compiled to WASM (`gifsicle-wasm-browser`, pinned). Logic was carried over from the old `tetra-next` `useGifsicle` hook and reworked.

- `parse-gif.ts` – reads size, frame count and per-frame delays from the GIF block structure (no decoding). Delays under 2 cs are stored as 10 cs, which is how browsers play them.
- `gifsicle.ts` – `runGifsicle(buffer, commands, signal)`. The package's own `run()` logs every call and can't be cancelled, so we take its worker blob URL (`gifsicle.tool.worker()`, wasm inlined, the package is dynamically imported on first use) and post `{ data, command, folder, isStrict }` ourselves. One fresh worker per run (the emscripten program runs once); aborting terminates it. `isStrict` is off: strict mode rejects on any stderr line, and gifsicle warns on big files ("huge GIF, conserving memory", reproduced with a 25 MB GIF) while still writing a correct result. A real failure (bad command, broken file) writes nothing to `/out`, so the run returns `[]` and `renderMedia` reports "Processing produced no file." The input is named `input.gif`, `/tem` is scratch space, every file in `/out` is returned.
- `gif-commands.ts` – `buildCommands`, one run with two commands:
  1. `-U input.gif -d<cs> #<i> … -o /tem/frames.gif` – trim and frame rate: one frame per `1/fps` slot of playback time, each kept frame shows for the summed delay of the frames it replaces (tempo stays the same), divided by speed, at least 2 cs.
  2. `-U [--crop x,y+wxh] [--crop-transparency] /tem/frames.gif --resize-fit SxS [--colors N] [--lossy=2×compression] -O3 -o /out/emote.gif`.

### Image engine (`src/lib/image/`)

[jSquash](https://github.com/jamsinclair/jSquash) (Squoosh's codecs as WASM; `@jsquash/resize`, `png`, `oxipng`, `webp`, `jpeg`, all pinned). The canvas can't do this alone: Safari's `toBlob` silently returns PNG for WebP, and there's no PNG optimisation.

- `render-image.ts` – starts `image-worker.ts` as a module worker, one per run (aborting terminates it, same as gifsicle).
- `image-worker.ts` – takes the allowed formats with each job (`formats`; all three by default, PNG and WebP in the panel); *Auto* and an explicit format outside them fall back to the allowed candidates. Decodes with `createImageBitmap`, crops on an `OffscreenCanvas`, trims transparent edges, resizes with lanczos3 (premultiplied, linear RGB, only when shrinking), then encodes: PNG → oxipng level 2; WebP lossless at compression 0, else quality `100 − 0.9 × compression`; JPEG quality 95 at 0, else the same formula, flattened onto white. *Auto* compares only formats that keep what the slider promises: PNG and lossless WebP at 0; above that lossy WebP, plus JPEG when nothing is transparent. Smallest wins.
- Vite: `worker.format: "es"` (the worker loads codecs lazily) and `optimizeDeps.exclude` for `@jsquash/*` (pre-bundling breaks their `new URL(…wasm, import.meta.url)` lookups in dev). The `.wasm` files are emitted as assets and only fetched when an image is processed.
- Checked in Bun with the same options as the worker (64 px frame): PNG+oxipng 6.1 KB, WebP lossless 4.1 KB, WebP q55 0.8 KB, JPEG q55 0.9 KB. The full worker (OffscreenCanvas) needs a browser.
- Not supported yet: animated WebP/APNG (only the first frame is read), AVIF output (Discord support unconfirmed), PNG color reduction.

## Verified gifsicle behavior

Checked against the native binary (1.93) and the WASM build (its worker script evaluated in Bun with browser-worker globals stubbed):

- `-d<cs> #<i>` after the input sets that frame's delay; frames not listed are dropped.
- `--crop` must come before the input file; it's applied before `--resize-fit`.
- `--resize-fit WxH` keeps the aspect ratio and never upscales.
- `--crop-transparency` trims the transparent border shared by all frames.
- `--explode` writes `<output>.<frame number>` per selected frame.

## Decisions and rejected approaches

- **Everything local.** No upload anywhere on `/editor`; WASM engines in workers. The panel sends only the finished result (see [Panel integration](#panel-integration)).
- **Renders: abort, don't lock.** Every change aborts the run in flight and versions results (`createLatestTask`). Coalescing (finish the running render, then run the newest) was tried first and replaced; locking the UI during processing was rejected. Only the very first render blocks the screen.
- **Trim commits on release**, sliders don't (yet): a trim drag on a long GIF would otherwise start a full gifsicle run per frame step. If sliders feel heavy, the same draft + `onValueCommit` pattern applies to them.
- **One worker per run** (gifsicle and images): simplest way to cancel. Worker start + wasm compile costs tens of ms per run, fine at these sizes.
- **Settings start at the original**, not at 128 px: the editor isn't only for emotes.
- **Fitting is part of the crop**, set only in the Crop view; an earlier version had it in the sidebar next to a separate Square/Free crop toggle, which read as two unrelated settings.
- **Fill stretches to the longer side** (the bot uses the height); see Fitting above.
- **Spinner**: braille frames; an ASCII-ramp spinner jumped because glyph widths and weights differ.
- **ui-sdk `web.css` is global once loaded**, so `/editor` imports it too and the drop zone pins its own styles; ui-sdk's hidden form inputs are `position: absolute`, so scroll containers in the editor are `relative` (see [../web.md](../web.md#ui-sdk)).

## Testing

There's no test runner in the repo yet. What was checked, and how to repeat it:

- **Pure logic** (`latest-task.ts`, `local-library.ts` with `fake-indexeddb`, fitting math in `edit.ts`): `bun test` files kept outside the repo. Run them from `apps/web` so the `@/` alias resolves. Worth committing once a test setup exists.
- **gifsicle commands**: the native binary that core already ships (`node_modules/gifsicle/vendor/gifsicle`) for quick checks, and the real WASM build by evaluating `gifsicle.tool.workerLocalUrl` in Bun with stubbed worker globals (`self` with `postMessage` and `location.href`, `importScripts`, and `process`/`require` set to `undefined` so it doesn't take the Node path).
- **jSquash codecs**: callable in Bun after `init*()` with the wasm read from `node_modules` (the emscripten codecs take an `instantiateWasm` override). `OffscreenCanvas`/`createImageBitmap` aren't available, so the full image worker needs a browser.
- **Not covered by anything automated**: the UI itself (window drag/resize, cropper, overlay, drop zone), Vite's dev handling of the jSquash wasm, Safari. Check those in a browser after changes.

## Open topics

- Below `lg` the editor stacks and the page scrolls; a fixed mobile layout isn't designed yet.
- Sliders render on every step (aborting the previous run); possibly commit on release like Trim.
- Not supported: animated WebP/APNG input (first frame only), AVIF output, PNG color reduction, GIF output for still images.
- Very large GIFs (10 MB+) take seconds per render; the 20 MB upload cap is a guess at what browsers handle, not measured.

## Panel integration

Two editors live in the panel, both inside `PanelLayout` in full-bleed mode (see [../web.md](../web.md#panel-layout)).

### Quick editor (`/panel/editor`)

The public editor's screens with the panel around them, from the sidebar's "Editor" or "Edit in editor" on an emote. No duplicated screens: the routes render `EditorStart` and `LibraryEditor` with `host="panel"`.

- **Start** (`/panel/editor`, header `Panel / Editor`): a short intro, then the drop zone and recent files, the same library as `/editor`. A file opens at `/panel/editor/<key>`.
- **File** (`/panel/editor/<key>`, header `Panel / Editor / <file name>`, the name from the library entry; the key until it's read): `MediaEditor` without `section` (the panel header is the breadcrumb), `New file` on the left of the toolbar, Reset, [Add to server](#add-to-server) and Download on the right, Discord emote mode on by default; the editor's height is the content area's. A key that isn't in this browser (another browser, evicted, an old `/panel/editor/<taskId>` link) shows the same "This file isn't in this browser" state inline, with "Open a file" back to `/panel/editor`.

### Add to server

`/editor/$key` and `/panel/editor/$key` (not the task editor, which has its own add) offer "Add to server ▾" left of Download.

- **Shown** only in Discord emote mode and when `useCanAddToServer` says the user has a session (`GET /me/state`) with at least one manageable server (`GET /guilds`). On the public editor this runs in the background: it never blocks the editor, redirects or asks to log in; no session, an error or no servers simply leave the button out. The session query is shared with the panel (`["session"]`), with a 5-minute `staleTime` here so refocusing doesn't ask again each time. With the button shown it is the primary (glowing) action and Download turns secondary.
- **Lazy**: `AddToServerMenu` (`components/editor/add-to-server-menu.tsx`) and, on the public editor, a `Toaster` load with `React.lazy` only once the user can add, so the public page ships only the two small queries for everyone.
- **Menu**: `ServerMenuItems` (`components/panel/server-menu-items.tsx`, the same rows as the emote menu's Add to server: icon, name, "N free" for the result's type, full servers listed but disabled). The type is the source's: animated GIF or static.
- **Enabled** only with a finished, current result (no newer render running) that fits 256 KB and a valid emote name; otherwise the trigger is `focusableWhenDisabled` with a `title` saying why. "Adding…" while a request runs.
- **Upload**: `useUploadEmote` (`lib/emote-mutations.ts`): result → data URL (`toEmoteDataUrl`, `lib/emote-data-url.ts`, shared with the task add) → `POST /guilds/:guildId/emote/upload` `{ emote, name }`, which core sends to Discord as is (no second optimization). `toast.promise` with `+` / `-`, errors through `emoteErrorMessage` (a 401 says the session ended, and the global 401 handler rechecks the session, so on `/editor` the button goes away). Success moves the slot count of the type from `preview` at once (`holdSlotCounts` + `shiftSlotCounts`, then `refreshSlotCounts`). The editor keeps its state either way, so the same result can go to another server.
- Verified against a mock API: GIF and WebP data URLs, counts move right away (a server at 49/50 animated turns "animated full"), a 409 toasts and keeps the editor, the trigger is off over 256 KB, with an invalid name and while rendering, the switch hides it; keyboard: Tab to the trigger, Enter, arrows (wrapping), Enter adds and focus returns to the trigger. On `/editor` without a session there's no button, no redirect and no script error; the browser itself logs the `401` of `GET /me/state` as a failed resource in the console, which a fetch can't suppress.

### Task editor (`/panel/tasks/$taskId`)

`/panel/tasks/$taskId` (`routes/panel.tasks.$taskId.tsx` + `.lazy.tsx`), reached from "Fix in editor" on a task tile or "Open in editor" in the task emote menu (it lived at `/panel/editor/$taskId` until the quick editor took that path); the header shows `Panel / Tasks / :name:`.

- **Loading**: `taskQueryOptions` and `taskFileQueryOptions` start together (the file only needs the id). The file comes through core's proxy `GET /tasks/:taskId/file` (third-party hosts don't send CORS headers; never fetch `emote.url` from the browser), read with `unwrapBlob`, then `loadMediaFile`. A dead upstream can take ~30 s, so the file query doesn't retry on its own.
- **States** (inline under a header with the emote's preview, name, server and source; never centered): loading the task; downloading the original (Spinner + "a slow host can take up to half a minute"); `TASK_NOT_FOUND` from either request → "This task is gone" + Back to tasks; `DOWNLOAD_DATA_FAILED` → Retry + Discard; `URL_NOT_ALLOWED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE` and a file that won't decode → Discard only; anything else → Retry.
- **Editor**: `MediaEditor` without `section`, `discordOnly` (so PNG + WebP only: `POST /tasks/:id` takes `data:image/gif|png|webp`, GIFs stay GIFs), name prefilled with the emote's name and checked as typed (`emoteNameError` = core's `EMOTE_NAME_REGEX`). No local library: nothing is saved between visits.
- **Toolbar**: "Discard task" on the left (`DiscardTaskDialog`: ui-sdk alert dialog placed at the top third, the confirm runs the `DELETE` as its `action` so it stays open with "Discarding…" and shows an error inline; 404 counts as done; then toast and `/panel/tasks`). Right: Reset and "Add to <server>", enabled only with a finished, current result (not while a newer render runs) that fits 256 KB and a valid name.
- **Add**: the result blob → data URL → `POST /tasks/:taskId` `{ emote, name }` in `toast.promise`. Success: navigate to `/panel/servers/$guildId` first (the page observes the task, which 404s from then on), then drop the task from the caches and invalidate `["guilds"]` and that server. Errors toast through `emoteErrorMessage`; the editor keeps its state.
- **Destination notices** from the guilds cache: the server has no free slots of the emote's type (Add stays enabled, the cache may be stale), or the user can't manage it anymore (Add disabled).
- Verified against a mock API with a 1 MB 7TV GIF: auto-fit to 182 KB, POST sends `data:image/gif;base64,…`, error toasts keep the editor, success lands on the server view; the window doesn't scroll at 1440×900 and 1024×768, no horizontal scroll at 390 px.
