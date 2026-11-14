# Emote editor

Paths in this document are relative to `apps/web`. Overview of the web app: [../web.md](../web.md). UI rules: [../branding.md](../branding.md).

One editor, two entry points:

- **`/editor`** – public, no account, nothing uploaded. Prerendered intro with a drop zone (`GifDropzone`: drop anywhere on the page, paste, or pick; `.gif` only, up to 20 MB). After a file is chosen the page swaps to the editor; the toolbar has `New file` and `Download` (always enabled once a result exists; the size note under the meter says Discord takes up to 256 KB). Route: `src/routes/editor.tsx` (head) + `editor.lazy.tsx` (page).
- **`/panel`** – mockup of the logged-in panel (no auth, no API yet). Loads the bundled `public/panel/sample-emote.gif` (catJAM from 7TV, 128×128, 158 frames, ~1 MB) into the same editor; `Add to Discord` is a placeholder, disabled until the emote fits.

## Screen

`src/components/editor/emote-editor.tsx` holds the edit state; pages pass the toolbar actions and an optional size note as render props.

- **Large file notice**: GIFs over 5 MB (`LARGE_GIF_BYTES` in `emote-file.ts`) open normally, with a `Notice` bar under the toolbar saying the editor is made for smaller GIFs, processing may be slow or fail, and a dedicated GIF tool will do better. `Continue anyway` hides it. The hard upload limit stays 20 MB (`MAX_GIF_BYTES` in `gif-dropzone.tsx`).
- **Toolbar**: breadcrumb (`tetra / <section> / <name>`), `Reset`, page actions.
- **Main area**, `Preview | Crop`:
  - *Preview*: original and real result side by side on `bg-checker`. A `Fit | Actual size` toggle sets the scale: *Fit* (default) draws both at the same on-screen size (256 px box), so lowering Size shows up as lost detail instead of a smaller picture, with `image-rendering: pixelated` whenever an image is scaled up; *Actual size* shows real pixels (shrunk only if larger than the box). The original marks the crop: an orange outline with everything outside dimmed. While a newer result renders, the old one stays, dimmed, and the title says "updating". The result pane ends with an "in chat" row (22 px inline, 48 px jumbo).
  - *Crop*: ui-sdk `ImageCropper` (box mode, `Square | Free`, `Remove crop`), image scaled with `image-rendering: pixelated`. Square is the default only for square GIFs, so opening Crop never changes the result by itself. A crop covering the whole image is stored as `null`.
  - *Trim* (animated GIFs only): two-thumb slider over a film strip of 16 frames, in **frame indices** (frames can have different delays), labels in seconds.
- **Inspector**: name (`:name:`, inline validation, 2–32 letters/numbers/`_`, defaulted from the file name), size (`SizeMeter` against 256 KB with the original size as the bar's end, `Fit automatically`), and six options: size (longest side, px, never upscales), frame rate, colors, compression, speed, trim empty edges. Frame rate, speed and trim are hidden for single-frame GIFs.

## Processing (`src/lib/gif/`)

Everything runs in the browser with [gifsicle](https://www.lcdf.org/gifsicle/man.html) compiled to WASM (`gifsicle-wasm-browser`, pinned). Logic was carried over from the old `tetra-next` `useGifsicle` hook and reworked.

- `parse-gif.ts` – reads size, frame count and per-frame delays from the GIF block structure (no decoding). Delays under 2 cs are stored as 10 cs, which is how browsers play them.
- `gifsicle.ts` – `runGifsicle(buffer, commands, signal)`. The package's own `run()` logs every call and can't be cancelled, so we take its worker blob URL (`gifsicle.tool.worker()`, wasm inlined, the package is dynamically imported on first use) and post `{ data, command, folder, isStrict }` ourselves. One fresh worker per run (the emscripten program runs once); aborting terminates it. The input is named `input.gif`, `/tem` is scratch space, every file in `/out` is returned.
- `emote-pipeline.ts` – the edit model and `buildCommands`. One run, two commands:
  1. `-U input.gif -d<cs> #<i> … -o /tem/frames.gif` – trim and frame rate: one frame per `1/fps` slot of playback time, each kept frame shows for the summed delay of the frames it replaces (tempo stays the same), divided by speed, at least 2 cs.
  2. `-U [--crop x,y+wxh] [--crop-transparency] /tem/frames.gif --resize-fit SxS [--colors N] [--lossy=2×compression] -O3 -o /out/emote.gif`.
  `reduceStep` is the auto-fit ladder: compression to 60, frame rate down to 12, colors to 64, compression 100, then size down to 48. `Fit automatically` runs it with real renders until the result fits, then applies the settings; any manual change aborts it.
- `emote-file.ts` – `loadEmoteFile` (buffer + info + object URL + name from the file name), `emoteNameError`.

`use-emote-render.ts` renders through `createLatestTask` (`src/lib/latest-task.ts`): every edit aborts the run in flight (its worker is terminated) and starts a new one, and each run carries a version, so a result that still arrives after a newer request is discarded (and its object URL revoked) instead of replacing the newer one. The UI is never locked; during a continuous drag results arrive once the input pauses for as long as one run takes. Errors of aborted runs are ignored. `use-film-strip.ts` extracts the strip once per file with `--explode` (outputs are `frame.gif.NNN`, sorted numerically).

There's no test runner in the repo yet; `createLatestTask` was checked with `bun test` against a fake run (abort of the run in flight, stale result discarded, errors of aborted runs swallowed, dispose). Worth committing once tests are added.

## Verified gifsicle behavior

Checked against the native binary (1.93) and the WASM build (its worker script evaluated in Bun with browser-worker globals stubbed):

- `-d<cs> #<i>` after the input sets that frame's delay; frames not listed are dropped.
- `--crop` must come before the input file; it's applied before `--resize-fit`.
- `--resize-fit WxH` keeps the aspect ratio and never upscales.
- `--crop-transparency` trims the transparent border shared by all frames.
- `--explode` writes `<output>.<frame number>` per selected frame.
