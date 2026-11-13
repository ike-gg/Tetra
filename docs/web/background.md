# Homepage background

Paths in this document are relative to `apps/web`. Overview of the web app: [../web.md](../web.md).

An animated ASCII-art field of 7TV emotes behind the homepage, drawn by a single WebGL2 fragment shader on a fixed `<canvas>` (`EmoteBackground`). There are no DOM nodes per emote, so the cost per frame is one fullscreen pass regardless of how many emotes are visible.

**Emote atlas (build time).** `bun run build:emote-atlas` fetches popular emotes from the 7TV v4 GraphQL API and writes two files that are committed to the repo:

- `public/emote-atlas.webp`: 64 emotes, each as 16 animation frames. The image is a 4×4 grid of pages (one page per frame), each page an 8×8 grid of 40px emote cells. One request instead of dozens of small emote downloads.
- `public/emote-atlas.json`: the layout (`emoteGrid`, `pageGrid`, `frames`, `cell`) and the loop duration of each emote in seconds. Ignored by Biome because it is generated.

Per emote the script resamples the animation at 16 evenly spaced moments (long animations keep only roughly their first 1.4s, so they don't become a slideshow), crops all frames to the opaque area they share (so the animation doesn't jump), fills the cell like `object-fit: cover`, and skips emotes whose cell is still mostly transparent (`MIN_COVERAGE`). Low resolution is enough because each emote is only a dozen or so characters wide on screen. Knobs at the top of the script: `--sort=<7TV SortBy>` (default `TRENDING_MONTHLY`; `TOP_*` gives the mainstream emotes), `EXCLUDED_NAMES` (review the printed list for names unfit for the homepage), `MIN_COVERAGE`, `FRAMES`, `CELL`, `PADDING`.

**Shader (runtime).** For each pixel:

1. Project the screen onto a plane tilted away from the viewer (horizon above the viewport, `HORIZON`), scrolling from bottom to top (`SCROLL_SPEED`). Content further up is smaller and fades out towards the top edge.
2. Split the plane into character cells (`CHAR_W`×`CHAR_H`) and lay emotes on it in a staggered grid (`EMOTE_SIZE`); a hash of the tile picks the emote and the starting point of its animation.
3. Sample the emote's current frame once per cell (`textureLod` at the mip level matching the cell size) and map its brightness to a glyph from `GLYPHS`. Glyphs come from a texture drawn on a 2D canvas at startup. Dark but opaque pixels still get a glyph, so silhouettes stay readable.
4. Color: idle glyphs are dim and mostly gray with a little of the emote's color (`IDLE_BRIGHTNESS`, `IDLE_SATURATION`). Near the cursor they blend into full color (`REVEAL_RADIUS`). The distance is measured on the plane, not on the screen, so the highlight follows the perspective. The cursor position is used as is, without smoothing.
5. Cursor trail: moving the cursor leaves a trail of up to `TRAIL_POINTS` points (spaced `TRAIL_SPACING` px, strength from cursor speed relative to `TRAIL_FULL_SPEED`, fading with `TRAIL_DECAY`), sent to the shader in plane coordinates. Inside it glyphs scramble, and where it's strong the ASCII filter melts into the emote image underneath, sampled per pixel at a slightly blurred mip level, before settling back into ASCII. `TRAIL_RADIUS` sets its width. Off with `prefers-reduced-motion`. (A displacement "wind" was tried first and rejected.)
6. Click ripple: a left click anywhere except on interactive elements (`CLICK_IGNORE`) drops a water ripple on the plane at that point (`CLICK_WAVE_SPEED`, up to `CLICK_WAVES` at once). Around the expanding front runs a packet of rings (`CLICK_WAVE_WIDTH`, `CLICK_WAVE_LENGTH`): the surface height lifts the content and lightens crests, its slope bends the glyph grid outwards like refraction (`CLICK_WAVE_AMPLITUDE`), and on the crests the ASCII melts into the emote images with a faint orange tint. It fades out over `CLICK_WAVE_LIFE_MS`. Off with `prefers-reduced-motion`. Double/triple clicks outside interactive elements don't select text.
7. Intro: after load, cells appear in a ring expanding from the bottom center, trailed by a band of the brand orange `#f64f02` (`WAVE_COLOR`, `INTRO_DURATION_MS`).

8. Page scroll: the canvas is fixed; scrolling the page advances the plane at `PAGE_PARALLAX` of the scroll speed (reads as very distant) and dims the field down to `SCROLLED_DIM` over one viewport, so sections below stay readable.

JS only loads the atlas, uploads the textures, and sets uniforms each frame (time, scroll, page scroll, mouse, cursor trail, click waves, intro progress). With `prefers-reduced-motion` the scroll, the emote animation and the intro are disabled. The radial vignette that keeps the hero text readable is a plain CSS gradient `div` in `src/routes/index.tsx`.

Tried and rejected: bending the plane into a cone/bowl (looked worse than the flat tilt).
