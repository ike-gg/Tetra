# Animated marks

Both are 512×512 looping GIFs that start and end on the static mark (`../static/`, seed 38), so the frame Discord shows when an icon isn't playing is the static mark.

## Server icon

`tetra-server-512.gif`, about 3.6 s per loop. The `/logo` drop, played on the static mark's ASCII grid (28 characters per side, see `../static/`):

1. Rest (1.5 s): the static mark, a 50% square of dense glyphs on the wall. The first and last frames are this frame, so the icon Discord shows when it isn't playing is the static mark.
2. Drop (1.33 s): the seven reel emotes fall in full size, one cell per emote (130 ms each, ease-out `cubic-bezier(0.23, 1, 0.32, 1)`), the same keyframes as `apps/web/src/components/logo.tsx`. The strip scrolls a whole row at a time, so everything stays on the grid.
3. Block (0.35 s): the white block lands last and fills the whole icon.
4. Shrink (0.45 s, ease-out): the block shrinks two characters at a time back to the 50% square, uncovering the wall.

Emotes go through the homepage's ASCII filter (`GLYPHS` ` .:-=+*#%@` by luminance, transparency shows the wall, color 30% saturated) at full brightness, in Geist Mono 700. Wall and square as in the static mark: 400 in `#433f3e`, 900 in `#fbfaf9`, on `#0b0a09`.

Animated server icons need a server with Boost level 1 or more.

## Bot avatar

`tetra-bot-512.gif`, about 3.9 s per loop. The 50% square turns out to be the front of a cube, which tumbles one full turn about its body diagonal and lands back on the static mark.

1. Rest (1.5 s): the static mark.
2. Turn (2.4 s, ease-in-out cubic): 360° about the diagonal. A cube matches itself every 120° about that axis, so the square face comes round three times on the way.

Tried and dropped: a wind-up plus three quarters of a turn about the vertical with the cube lifting to show its top face, and a mix of that with the diagonal tumble.

Each cell is ray-cast against the cube, with a little perspective (the camera 60 characters away, scaled so the front face at rest is exactly 14 characters). The light comes from the upper left, scaled so a face turned straight at the viewer is full: the visible faces get different shades and the cube reads as a solid. A cell's glyph is a dithered pick from ` .:-=+*#%@` by its shade (`floor(shade × 6 + random × 4)`, with the cell's own random value), which at full light is exactly the static mark's dense pick. Glyphs are Geist Mono 900, colored from `#777270` (unlit) to `#fbfaf9` (full). The cube's widest silhouette stays inside Discord's circle crop.
