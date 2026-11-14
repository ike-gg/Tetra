# Tetra branding

The visual and verbal identity of Tetra. Tokens live in `apps/web/src/styles/app.css`; the rendered version is the `/branding` page (`apps/web/src/routes/branding.tsx`). When a decision here changes, update the CSS, this file and the page together.

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
- **Signal** `signal-300/400/500`: hue 215, the cool counterpoint to orange. At most one signal element per view, never on the same element as orange, never for primary actions or large fills.
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
- The serif accent is the brand's one flourish per heading: "Your chat's *emotes*, now on Discord."
- Small labels and eyebrows: Geist Mono, `text-xs`, wide tracking, lowercase or uppercase consistently within a block.
- Fonts are self-hosted from the `geist` npm package (OFL) in `apps/web/src/assets/fonts/`.

## Shape

- **Border radius is always 0.** All Tailwind `--radius-*` tokens are 0 and ui-sdk's `--ui-radius` is 0. Do not use `rounded-full` either (it bypasses the tokens), not even for dots, avatars or pills: they are square too.
- Structure comes from **1px hairlines** (`border-border`) instead of shadows or rounded cards. Grids of cards share borders (`gap-px` on a `bg-border` container).
- Shadows are not part of the language. The one exception is a tight orange glow (`glow` on `Button`, `0 0 18px -4px brand-500`) on the page's main call to action. It doesn't change on hover.

## Native feel

The web panel should feel like a native desktop app. Controls behave like OS controls, not like links on a marketing page:

- **No transitions on interactive states.** Hover, press and selection change color instantly. No `transition` / `duration-*` on buttons, list items, tabs or cards.
- **Default cursor on controls.** Buttons and button-like links keep the arrow cursor (`cursor-default`), not the pointing hand. Disabled controls show `not-allowed`, pending ones `wait`. Inline text links inside prose may keep the pointer.
- **Instant press feedback.** Every control has an `active` state one step darker than its hover state.
- **No text selection on chrome.** Buttons and controls are `select-none`; content (emote names, text the user may copy) stays selectable.
- **Focus rings only from the keyboard** (`focus-visible`), never on mouse click.
- **No tap highlight** on touch devices (set globally).
- Panel controls (sliders, segmented controls, fields) follow the same rules: square thumbs and segments, orange only for the active fill, values in Geist Mono with tabular numbers, and anything derived from a control (like a size estimate) updates live while it is dragged, not on release.
- Animation is for content and signature moments (the background, the intro wave, the ASCII decode), never for the feedback of a control.

## ASCII

- The ramp `" .:-=+*#%@"` (light to dense) is shared by the emote background, the decode effect and decorative fills. Reuse it instead of inventing new ones.
- Allowed uses: small character illustrations in feature cards, section labels like `[01] / features`, terminal-style command lines, a faint ASCII texture behind a block (`brand-500` at around 10% opacity), the text-decode effect on a highlighted word.
- Keep it decorative: mark it `aria-hidden`, never put meaning only in ASCII art.
- One ASCII moment per block. Overuse turns the accent into noise.

## Motion

- Entrances: short rise and un-blur (`animate-hero-rise`, 0.9s, staggered by about 150 ms).
- Signature moments: the radial orange wave when the background appears, the ASCII decode of an accent word, a blinking block cursor.
- Hover: instant color or position changes, no transitions, no scaling (see [Native feel](#native-feel)).
- Everything respects `prefers-reduced-motion`: content appears instantly and the background stops moving.

## Imagery

- Emote previews sit on `bg-checker`, a low-contrast neutral checkerboard, so transparency is visible without competing with the emote.

- The animated ASCII emote field is the brand's backdrop (see [web/background.md](web/background.md)). It stays far behind the content: dimmed, slowly drifting, colored only near the cursor.
- Real emotes appear in color only as product content (previews, the panel), not as decoration in the UI chrome.

## Voice

- Speak like chat, write like a tool: short, direct, a little playful. Emote names (`catJAM`, `:NODDERS:`) are welcome in examples.
- Lead with what the user gets ("Add any emote with one command"), not with technology.
- English, sentence case for headings and buttons ("Add to Discord", not "Add To Discord").
- The wordmark is lowercase `tetra` in Geist Mono when set in text (footer, labels). The new identity has no logo yet; the README banner predates it.
- Don't claim what isn't verified (pricing, permissions, numbers).
