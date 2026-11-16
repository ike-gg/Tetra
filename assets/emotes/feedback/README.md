# Feedback emotes

Custom emotes for the bot's embed titles, one per reply type of `FeedbackManager` (`apps/core`). Designed and previewed at `/branding/feedback` (`apps/web/src/components/feedback-emotes.tsx`); these files are exported from the same frames, 128×128, on a transparent background. Files are kebab-case like the rest of the repo; Discord emote names only take letters, digits and underscores, so upload them under the emote names below.

| File | Emote name | Reply type | Glyph color |
| --- | --- | --- | --- |
| `tetra-working.gif` | `tetra_working` | `working()` | white |
| `tetra-success.png` | `tetra_success` | `success()` | `#3acf38` |
| `tetra-error.png` | `tetra_error` | `error()`, `handleError()`, `unhandledError()` | `#eb3434` |
| `tetra-warning.png` | `tetra_warning` | `warning()`, `rateLimited()` | `#f7e139` |
| `tetra-attention.png` | `tetra_attention` | `attention()` | `#ff8812` |
| `tetra-info.png` | `tetra_info` | `info()` | `#0096ff` |
| `tetra-panel.png` | `tetra_panel` | `panel()` | `#fbfaf9` |
| `tetra-media.png` | `tetra_media` | `media()` | `#40c6ff` |
| `tetra-premium.png` | `tetra_premium` | `premium()` | `#9538ff` |

Glyph colors are TetraEmbed's embed colors ("embed colors" on the page), except working, which is white.

- **PNGs** have full alpha: the glyphs, and their shadow at 25%.
- **`tetra-working.gif`**: about 4 s a loop, 40 ms a frame (identical frames merged). GIF transparency is on or off per pixel, so the 25% shadow is ordered-dithered (a 4×4 Bayer pattern, about one shadow pixel in four drawn in full) and glyph edges are cut at 50% coverage. At the 22 px of an embed title the dither reads as the 25% shadow. `tetra-working.png` is its first frame, with full alpha, for anywhere a still is needed.
- Glyphs are Geist Mono 900 at their natural size, 13 characters per side, rendered at 4× and scaled down.
