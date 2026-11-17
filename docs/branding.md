# Tetra branding

The visual identity of Tetra. Tokens live in `apps/web/src/styles/app.css`; the rendered version is the brand book at `/branding`, whose guide chapter (`/branding/guide`, `apps/web/src/routes/branding.guide.tsx`) covers everything here except voice (that stays in [voice.md](voice.md)). The page itself follows the brand: no background grid, no decorative corner marks, lowercase copy per voice.md, and outside the component demos orange appears only in the heading's serif accent. When a decision here changes, update the CSS, this file and the page together.

## Brand book

Every brand page is a chapter of one book under `/branding`; chapters are listed in `BRAND_CHAPTERS` (`apps/web/src/components/brand-book.tsx`).

| Path | Chapter |
|---|---|
| `/branding` | The cover and contents: the ASCII cube (`BrandCube`, see [ASCII](#ascii)), the heading "the tetra *book*", and a numbered contents list: mono `[01]`, title, an ASCII dotted leader (` .` repeated, cut by overflow; a CSS `dotted` border draws round dots), the path as the "page" (from `sm`), the description in `muted` below. Rows are hairlines (`gap-px` on `bg-border`) with instant hover, never a card grid. |
| `/branding/guide` | Principles, color, type, shape, logo summary, ASCII, motion, native feel, every UI component. |
| `/branding/logo` | The mark and its emote drop. |
| `/branding/static-logo` | The static mark's proposals (noindex). |
| `/branding/feedback` | The feedback emotes (noindex). |

- Every chapter opens with `ChapterCrumb`: a mono line `← brand book / [NN] title` above its first eyebrow; the arrow part links back to the cover.
- The old paths `/logo`, `/static-logo`, `/feedback` answer 301 to their chapters (`docker/web.Caddyfile`). `vite dev` has no Caddy, so there they are 404s. Not TanStack redirect routes: the site is static files, so those would redirect only after the client loads, never with a real 301.
- A new brand page: an entry in `BRAND_CHAPTERS`, a route `branding.<slug>.tsx` with `ChapterCrumb`, `staticPages`, and a face on the cube if one is free (two are plain).

## Principles

1. **Square.** No rounded corners, anywhere. Squareness is the most recognizable part of the brand.
2. **Emotes are the color.** The interface stays dark and quiet so that emotes, the product's content, carry the color and the energy.
3. **ASCII as an accent.** Monospace glyphs and character art nod to chat and to the emote background. Use them as seasoning, not as the main course.
4. **One loud color.** Orange marks what matters on a screen. Everything else is neutral.
5. **Native, not a website.** Tetra should feel like an installed app, as little like a browser page as possible. See [Native feel](#native-feel).

## Color

Three roles. Dark only (`color-scheme: dark`); there is no light theme.

| Role | Token | Value | Use |
|---|---|---|---|
| Background | `background` (`neutral-950`) | `oklch(0.145 0.003 38)` | Page. `surface` (`neutral-900`) for raised areas, `border` (`neutral-800`) for lines. |
| Brand | `primary` (`brand-500`) | `oklch(0.655 0.214 38)` = `#f64f02` | Primary actions, the key word in a heading, focus rings, active states. |
| Signal | `signal` (`signal-400`) | `oklch(0.81 0.13 215)` | Rare: a "new"/"beta" tag, a highlighted number, a single detail that must not compete with orange. |

- **Brand scale** `brand-50…950`: fixed hue 38, chroma kept inside sRGB. `brand-400` is the hover of `brand-500`.
- **Neutrals** `neutral-50…950`: Tailwind's lightness steps with a faint tint of hue 38, so grays feel warm next to the orange. Text: `foreground` (`neutral-100`), secondary text `muted` (`neutral-400`).
- **Signal** `signal-300/400/500`: hue 215, the cool counterpoint to orange. At most one signal element per view, never on the same element as orange, never for primary actions or large fills. Text selection (`::selection`) is signal at 35% too: it's the user's mark, not something the page highlights.
- **Danger** `danger` (`oklch(0.704 0.191 22.2)`): only for errors and invalid fields (border + message). Not a brand color, never for decoration or buttons. "Over the limit" is not an error, it's what matters on the screen, so it uses orange.
- **Text on orange is dark** (`primary-foreground`): white on `#f64f02` fails contrast. Same for `signal-foreground`.
- **Contrast**: body text at least 4.5:1, control edges and focus rings 3:1.
- Prefer semantic tokens (`background`, `surface`, `foreground`, `muted`, `border`, `primary`, `signal`) over raw scale steps.

## Typography

| Family | Token | Role |
|---|---|---|
| Geist | `font-sans` | Default for everything: UI, body, most headings. Variable 100–900 with italics. |
| Geist Serif | `font-serif` | Accent only: one or two words in a heading, usually in `text-primary`. Display face, single weight (400), never for body text or UI. |
| Geist Mono | `font-mono` | ASCII art, labels, commands, code, small technical captions. |

- Headings: Geist semibold, tight tracking (`tracking-tight`), balanced wrapping (`text-balance`). In code: `Heading`, `Text`, `Accent` and `Eyebrow` from `apps/web/src/components/ui/` (see [web.md](web.md#ui-components)).
- The serif accent is the brand's one flourish per heading: "add any emote. *that's it*". Not every heading gets one: on the homepage only the hero and the closing call to action do.
- Small labels and eyebrows: Geist Mono, `text-xs`, wide tracking, lowercase or uppercase consistently within a block.
- Fonts are self-hosted from the `geist` npm package (OFL) in `apps/web/src/assets/fonts/`.

## Shape

- **Border radius is always 0.** All Tailwind `--radius-*` tokens are 0 and ui-sdk's `--ui-radius` is 0. Do not use `rounded-full` either (it bypasses the tokens), not even for dots, avatars or pills: they are square too.
- Structure comes from **1px hairlines** (`border-border`) instead of shadows or rounded cards. Grids of cards share borders (`gap-px` on a `bg-border` container).
- Shadows are not part of the language. Two exceptions: a tight orange glow (`glow` on `Button`, `0 0 18px -4px brand-500`) on the page's main call to action, which doesn't change on hover; and the navbar's fade, a gradient of the page color (90% → transparent) behind a navbar that has no background or border of its own, so it stays readable over the emote field.

## Native feel

The web panel should feel like a native desktop app. Controls behave like OS controls, not like links on a marketing page:

- **No transitions on interactive states.** Hover, press and selection change color instantly. No `transition` / `duration-*` on buttons, list items, tabs or cards.
- **Default cursor on controls.** Buttons and button-like links keep the arrow cursor (`cursor-default`), not the pointing hand. Disabled controls show `not-allowed`, pending ones `wait`. Inline text links inside prose may keep the pointer.
- **Instant press feedback.** Every control has an `active` state one step darker than its hover state.
- **No text selection on chrome.** Buttons and controls are `select-none`; content (emote names, text the user may copy) stays selectable.
- **Focus rings only from the keyboard** (`focus-visible`), never on mouse click.
- **No tap highlight** on touch devices (set globally).
- Panel controls (sliders, segmented controls, fields) follow the same rules: square thumbs and segments, orange only for the active fill, values in Geist Mono with tabular numbers, and anything derived from a control (like a size estimate) updates live while it is dragged, not on release.
- **No vertically centered screens.** App screens (login, loading, errors, empty states) start below a fixed top margin, like a page the browser lays out on its own, never centered vertically in the viewport. Centering horizontally is fine.
- Animation is for content and signature moments (the background, the intro wave, the emote drop), never for the feedback of a control.

## ASCII

- The ramp `" .:-=+*#%@"` (light to dense) is shared by the emote background and decorative fills. Reuse it instead of inventing new ones.
- Allowed uses: small character illustrations, section labels like `[01] / features` (the homepage has none: numbered eyebrows on every section read as a template), terminal-style command lines, a faint ASCII texture behind a block (`brand-500` at around 10% opacity).
- Keep it decorative: mark it `aria-hidden`, never put meaning only in ASCII art.
- The closing call to action on the homepage has the one interactive ASCII field: shimmering ramp glyphs in which the word `tetra` appears as a shape drawn by denser, brighter glyphs, one big word around the cursor and a grid of them while "add to discord" is hovered (`TetraField`).
- The brand book's cover has the second one, the cube (`BrandCube`, below under [Motion](#motion)).
- One ASCII moment per block. Overuse turns the accent into noise.

## Motion

- Entrances: short rise and un-blur (`animate-hero-rise`, 0.9s, staggered by about 150 ms).
- Loading: `Spinner`, braille dots chasing around one cell, never a rotating circle.
- Signature moments: the radial orange wave when the background appears, the emote drop (the logo's intro, and the homepage accent "that's it", where the word is cut into near-square columns and each column gets its own random 5–7 emotes in random order, its own speed (62–80 ms per cell) and its own start (0–250 ms), so the columns fall and land out of step; neighbouring columns never show the same emote at the same moment. The emotes fall at a constant speed, then the text slice comes in on an ease-out cubic (`cubic-bezier(0.33, 1, 0.68, 1)`, 3 cells' worth of the column's fall time) whose starting speed matches the fall, so there is no seam. A spring with the fall's speed handed in was tried and rejected: it overshot and the letters visibly bounced. `EmoteDropText` in `apps/web/src/components/emote-drop-text.tsx`), the odometer on the homepage numbers (every digit a reel falling from 0 through one full turn to its digit, `cubic-bezier(0.23, 1, 0.32, 1)` over 1.4 s, 60 ms between digits and 150 ms between numbers, once when scrolled into view), a blinking block cursor.
- **The brand book's cube** (`BrandCube` in `apps/web/src/components/brand-cube.tsx`, on `/branding`): the bot avatar's tumbling cube brought to life. A 2D canvas of Geist Mono 700 glyphs (font size picked for about 46 columns, 9–14 px, at most 72 columns, DPR capped at 2); every cell is ray-cast against the cube (camera 8 units away, a little perspective), and its glyph is the bot avatar's dithered pick from the ramp by ink × light (`floor(density × 6 + random × 4)`, never blank), the random value fixed per face texel (18 per side, seed 38) so the texture moves with the cube. Light from the upper left, scaled so a face turned straight at the viewer is full, ambient 0.22. Missed cells whose corners touch the cube get a light edge glyph, so the silhouette is anti-aliased. Glyphs are `neutral-50` at ten alpha levels by density (one `fillStyle` per bucket). Faces are chapters: front (+z) the static mark (dense square on the light wall, so at rest the cube shows the favicon), right (+x) the logo (bands of glyphs dropping into the square one cell at a time, like the reel), left (−x) the guide (the one orange face), top (+y) the feedback emotes (the success check in `signal`, the page's one cool detail); back and bottom are plain wall. Idle: a slow tumble about a mostly vertical world axis (0.35 rad/s), eased in from rest. Drag (pointer capture, touch too) turns it under the pointer, half a turn per cube width; release within 80 ms of the last move throws it (capped at 14 rad/s), and the spin settles back into the idle tumble exponentially (1.6 s). Hovering or focusing a contents row turns the cube to that chapter's face, an exponential slerp (τ 120 ms) that retargets from wherever it is, so running down the list never jumps; leaving resumes the tumble from still. A click (under 6 px of travel) on a chapter's face opens it; the canvas is `aria-hidden`, the contents list is the real navigation. A press on the cube neither selects text nor scrolls on touch; elsewhere the page scrolls. One rAF loop, running only while on screen (IntersectionObserver) and the tab is visible; drawing starts once the fonts have loaded, in a reserved square, so the prerendered page doesn't jump. Reduced motion: no tumble, no throw, no reel; the cube rests at the front face at a slight 3/4 angle, a hovered row snaps it to that face, and it redraws only on input.
- Hover: instant color or position changes, no transitions, no scaling (see [Native feel](#native-feel)).
- Everything respects `prefers-reduced-motion`: content appears instantly and the background stops moving.

## Logo

Rendered at `/branding/logo` (`apps/web/src/routes/branding.logo.tsx`), component `Logo` in `apps/web/src/components/logo.tsx`.

- **The mark is a plain square** filled with the current text color (`bg-current`): white (`foreground`) on dark, black on light. Size it with `size-*`, color it with `text-*`. No outline, no radius, no orange.
- **Intro animation:** on first appearance, seven popular 7TV emotes fall into the empty square one by one, then the solid block lands on top and stays. One strip element moves with `transform` only (WAAPI): each emote drops one cell in 130 ms with the strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` and nearly settles before the next, so it reads as separate falls rather than a scroll; the block's drop is longer (420 ms) because it is the landing. About 1.3 s in total.
- The drop starts only after the emote strip is decoded; until then the frame is empty (also in prerendered HTML).
- **Reduced motion:** no falling, the block fades in (200 ms).
- `animated={false}` renders the resting mark directly. It's a signature moment, not control feedback: play it once per visit (the navbar plays it once per page load: a refresh replays it, client-side navigation does not), never on hover or on every navigation. Clicking the logo replays it on purpose: a deliberate, rare action.
- **Static mark** (favicon, app icons, bot avatar, server icon, where the intro can't play): a black tile covered in random ASCII, 28 characters per side, with a centered square 14 characters (50%) wide. Classic ASCII art characters only (the ramp ` .:-=+*#%@`, no letters), at their natural size: the font size is the cell, nothing scaled or stretched. The wall is the light end (`.:-=+`) in `neutral-700`, barely visible; the square is the dense end (`*#%@`), Geist Mono 900 in `neutral-50`. Below 28 px it switches to a 16-grid pixel build (a white 8×8 square with 10% `neutral-500` specks, about 30% of wall pixels lit in `neutral-800`), since glyphs turn to grey texture at favicon size. Characters come from a seeded PRNG; the exported mark is seed 38. Centered: Discord's circle crop only takes wall. Exports (outlined SVGs, PNGs, `favicon.ico`) are in `assets/logo/static/`, see its README. The proposals page at `/branding/static-logo` (`apps/web/src/routes/branding.static-logo.tsx`, marks in `apps/web/src/components/static-logo-concepts.tsx`) still compares square widths of 36/50/64/79% with a reroll button. The site favicon uses the pixel build.
- **Animated server icon:** `assets/logo/animated/tetra-server-512.gif`, the `/branding/logo` drop on the static mark's 28-character grid: it starts and ends on the static mark, the emotes fall in at full size, the white block lands filling the whole icon and then shrinks back to the 50% square. Details in that folder's README.
- **Animated bot avatar:** `assets/logo/animated/tetra-bot-512.gif`, the static mark's square turns out to be the front of an ASCII cube that tumbles one full turn about its diagonal and lands back on the static mark. Same grid, glyphs and colors; details in the same README.
- **Discord banners:** `assets/logo/banners/` (bot profile banner 680×240, server banner 960×540, server invite background 1920×1080), all on the static mark's ASCII wall. The lockup is the static mark's white square of dense glyphs next to `tetra` in orange ASCII (Geist Serif, thickened, sampled per cell); the server banner has only the word, the invite background adds 12 emotes falling in ASCII. Details in that folder's README.
- **Feedback emotes:** `/branding/feedback` (`apps/web/src/routes/branding.feedback.tsx`, emotes in `apps/web/src/components/feedback-emotes.tsx`) proposes one 128 px custom emote per bot reply type (`FeedbackManager` in `apps/core`) to replace the colored squares in embed titles: a bold pictogram of dense glyphs, 13 characters per side (not 28: they are read at 22 px), on a transparent background: no tile and no wall, only a shadow of the same dense glyphs one cell down and right in the emote's color at 25% opacity. A black tile with a `neutral-800` wall was tried first and dropped. Working is the only animated one: a run of shapes, each handed to the next by a different move so the wait never repeats a trick. The spinner (an arc of the ring, `@` at the head, its tail thinning down the ramp) spins with a surge in its speed; its tail stops, the head runs on round to meet it and the ring floods at once into a disc (ease-out expo); the disc squares off (one superellipse, `|x|^p + |y|^p <= r^p` with p growing exponentially from 2, r easing from the disc's radius to a square of nine cells whose edges sit on cell boundaries); the square flips over in 3D like a card, a triangle on its back (ray-cast per cell, glyphs thinning as it turns away); the triangle squashes flat, faster and faster (ease-in), and pops open as a diamond with a small overshoot (ease-out back); the diamond winds up a touch, then collapses to a point spinning faster as it goes; the spinner grows out of the point with an overshoot, whirling into its turn. Morphs and the flip use an ease-in-out quint, so each move is one quick gesture. 100 frames of 40 ms, about 4 s a loop. Tried and dropped: a hexagon (from the diamond, a quarter turn while morphing) and a ring bursting out of the collapsed point before opening into the spinner, closing the spinner by stretching both ends at once (the arc came in from the other side), a triangle dissolving glyph by glyph into the diamond, a square ↔ circle ↔ diamond morph (too dull), a morph through seven shapes including a plus and a star, a flat coin spin about the vertical axis alone (too simple), a card flipping in 3D with the next shape on its back, a spinner that closed into a ring and flooded into the solid square (filling read as heavy), and a comet running round one morphing track (the spinner should be one of the shapes, not the base of the whole loop). A spinner (the brand's braille spinner scaled up to eight blocks) was tried first and dropped; success a check, error a cross, warning `!`, attention `?` (those embeds ask for a decision), info `i`, panel the Tetra square, media a play triangle, premium a diamond. Edges are anti-aliased in ASCII: a cell the shape only partly covers gets a lighter glyph from `.:-=+*` by its coverage (dense from 55%, nothing under 10%), so a moving edge thickens and thins instead of jumping a cell. Glyphs in TetraEmbed's colors or white, toggled on the page; working is white either way (its side bar stays info blue). `!`, `?` and `i` are laid out in whole cells with two empty rows between the dot and the rest (one row ran them together at 22 px). Exported to `assets/emotes/feedback/` (128 px PNGs, working as a GIF with a dithered shadow), see its README.
- **Favicon:** the static mark's pixel build (`favicon.svg` = `assets/logo/static/tetra-static-pixels.svg`, `favicon.ico` with the pixel build at 16, 32 and 48 px, in `apps/web/public/`). `apple-touch-icon.png` (180px) is still the old plain white square. No orange, no radius.
- Rejected static marks: an ASCII-textured T, tetromino, carved T, 2×2 grid, dither and cursor (too detailed at icon sizes); full-bleed squares with one edge detail (not centered); box-drawing corners and a corner slot cell (cut by Discord's circle); `[■]` in square brackets (its proportions never worked); "fading orange", a white block with orange emote sheets falling onto it (picked and exported once, then dropped for the wall); a wall with a square of random, light glyphs (the square turns into a grey patch below 32 px); a dense square of enlarged, stretched glyphs including letters (`#%@&$WMB8`), dropped for classic ASCII art characters at natural size; 12 to 32 characters per side and squares of 36/64/79%, settled on 28 and 50%.
- **Emotes:** a hand-picked set, in falling order: OMEGALUL, monkaW, HUH, PauseChamp, MONKA, NOWAY, gaga. First frame of each, cropped to a 1:1 square (MONKA is stretched whole into the square instead). Rebuild with `bun run build:logo-reel --names=OMEGALUL,monkaW,HUH@01FFMS6Q4G0009CAK0J14692AY,PauseChamp@01F6QWHR20000EB9BSAR8G1DKZ,MONKA@01H876RPX8000918ZGPJMBHB7Z:fill,NOWAY,gaga@01H96150H00003CY09NFH3G999` (entries are `name[@id][:fill]`; without `@id` the most popular emote with that exact name). Without `--names` the script picks full-bleed squares from 7TV's all-time top instead.

## Imagery

- Emote previews sit on `bg-checker`, a low-contrast neutral checkerboard, so transparency is visible without competing with the emote.

- The animated ASCII emote field is the brand's backdrop (see [web/background.md](web/background.md)). It stays far behind the content: dimmed, slowly drifting, colored only near the cursor.
- **Open Graph images** (1200×630, generated at build, see [web.md](web.md#seo)): dark `background`, a faint ASCII texture of the ramp, the white mark top left with `tetra` level with it on the right (the banners' lockup word: Geist Serif, thickened, letter-spaced, in orange ASCII on a finer grid than the texture), and bottom left a muted mono eyebrow, a Geist semibold heading with one serif accent in orange, the description in `muted`. No radius, no shadows, no emotes.
- Real emotes appear in color only as product content (previews, the panel), not as decoration in the UI chrome.

## Voice

How tetra talks (bot replies, errors, buttons, site copy) is in [voice.md](voice.md).
