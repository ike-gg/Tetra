# Banners

Discord images on the static mark's ASCII wall (`../static/`): random light ramp glyphs (`.:-=+`) in `#433f3e` on `#0b0a09`, Geist Mono at its natural size in square cells. Seed 38.

| File | Size | Where | Content |
| --- | --- | --- | --- |
| `tetra-bot-banner-680x240.png` | 680×240, 5 px cells | bot profile banner | the lockup bottom right (Discord puts the avatar over the bottom left) |
| `tetra-server-banner-960x540.png` | 960×540, 6 px cells | server banner | only `tetra`, centered |
| `tetra-invite-1920x1080.png` | 1920×1080, 7 px cells | server invite background | the lockup bottom right, 12 emotes falling, a few already landed bottom left |

- **Lockup:** a square of dense random glyphs (`*#%@`, Geist Mono 900, `#fbfaf9`), the static mark's square, then `tetra` in `#f64f02` (`brand-500`). The square and the word are the same height: 50 px on the bot banner, 105 px on the invite background (the server banner's word is 90 px).
- **Word:** `tetra` set in Geist Serif, thickened by 3% of the em so its hairlines are about two cells wide (at one cell they turned pale), and sampled once per cell: a cell more than 45% covered gets a dense random glyph, the edges `*` and `+`. Geist Mono 900 in orange.
- **Grid:** finer than the static mark's. The word needs 10 to 15 rows to keep the serif readable, so making it smaller meant smaller cells, not fewer rows.
- **Emotes** (invite only): OMEGALUL, monkaW, HUH, PauseChamp, MONKA, NOWAY, gaga (the logo reel) plus catJAM, PepeLaugh, KEKW, Sadge, peepoHappy, first frame from 7TV. They go through the homepage's ASCII filter (glyph by luminance, transparency shows the wall) in Geist Mono 700, with 55% saturation instead of the homepage's 30%: here the emotes are the subject. Falling ones are tilted and leave a short trail of `:` and `.` above them.

Discord crops and scales banners differently per client: keep anything that matters away from the edges.
