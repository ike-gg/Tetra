# Static mark

The static Tetra mark: a wall of random ASCII on black, 28 characters per side, with a centered square of dense glyphs, 14 characters (50%) wide. For places where the intro can't play: favicon, app icons, the bot's avatar, the Discord server icon. Seed 38, the same wall `/static-logo` draws first. See `docs/branding.md` (Logo).

| File | Build | Use |
| --- | --- | --- |
| `tetra-static.svg` | glyphs, outlined (no font needed) | any size from 28 px up |
| `png/tetra-static-1024.png`, `-512.png` | glyphs | Discord bot avatar and server icon, store listings |
| `png/tetra-static-256.png`, `-128.png`, `-64.png`, `-48.png`, `-32.png` | glyphs | smaller app icons, embeds |
| `png/tetra-static-180.png` | glyphs | `apple-touch-icon.png` |
| `tetra-static-pixels.svg` | 16-grid pixels | `favicon.svg`: browsers draw it at 16 px, where glyphs turn to grey texture |
| `png/tetra-static-pixels-16.png`, `-32.png`, `-48.png`, `-64.png` | pixels, 1× to 4× | favicon PNGs (32 is a 16 px tab on a 2x screen) |
| `favicon.ico` | pixels at 16, 32 and 48 | `favicon.ico` |
| `tetra-static-blue.svg`, `png/tetra-static-blue-512.png` | glyphs, blue variant | same mark on `#0839ff`: the square in `#ffffff`, the wall in `#5274ff` (30% white over the blue) |

The site's favicon (`apps/web/public/favicon.svg`, `favicon.ico`) is a copy of the pixel build; update both when it changes.

Colors are the brand tokens converted to sRGB hex: background `#0b0a09` (neutral-950), wall glyphs `#433f3e` (neutral-700), wall pixels `#282524` (neutral-800), square `#fbfaf9` (neutral-50), specks `#777270` (neutral-500). Glyphs are Geist Mono: the wall at 400, the square at 900, both at their natural size.

Don't add a radius or a circle: Discord crops the icon to a circle itself, and only wall gets cut.
