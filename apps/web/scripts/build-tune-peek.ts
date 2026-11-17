// Builds the data of the homepage's "tune it yourself" peek:
// - `public/home/tune-peek.json` (fetched when the peek comes into view): every frame of Vibe (7TV 3x.gif) as a GRID x GRID string, one character per
//   cell: " " transparent, "0"–"8" the cell's luminance in LEVELS levels
// - `src/lib/tune-peek-sizes.json` (bundled, so the readout is in the prerendered HTML):
//   the steps and the real output size in bytes for every combination of the peek's slider
//   steps, from the web editor's own gifsicle commands (`src/lib/gif/gif-commands.ts`:
//   frames picked like `planFrames`, then `-U … --resize-fit SxS --colors C -O3`)
// Run manually (`bun scripts/build-tune-peek.ts`, needs `gifsicle` on the PATH) and
// commit the output.

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const EMOTE_ID = "01FRTYR8RR0005FHRFCCZBSEKR";
const GRID = 48;
// Luminance levels per cell: as many as the ramp has glyphs for opaque cells, so nothing
// is lost at 256 colors, and 9 symbols pack far better than 16 (74 vs 110 KB gzipped)
const LEVELS = 9;
const SIZES = [96, 80, 64, 48, 32];
const FPS = [25, 20, 15, 10, 5];
const COLORS = [256, 128, 64, 32, 16];
// Cells at or below this alpha are blank
const ALPHA_CUTOFF = 128;

const framesFile = join(import.meta.dir, "..", "public", "home", "tune-peek.json");
const sizesFile = join(import.meta.dir, "..", "src", "lib", "tune-peek-sizes.json");

const response = await fetch(`https://cdn.7tv.app/emote/${EMOTE_ID}/3x.gif`);
if (!response.ok) throw new Error(`7TV answered ${response.status}`);
const source = Buffer.from(await response.arrayBuffer());

const {
  pages = 1,
  delay = [],
  width = 0,
  pageHeight = 0,
} = await sharp(source, {
  animated: true,
}).metadata();
// Centiseconds, as in the GIF and the editor's MediaInfo
const delays = Array.from({ length: pages }, (_, i) =>
  Math.round((delay[i] ?? 100) / 10)
);

const frames: string[] = [];
for (let page = 0; page < pages; page++) {
  const { data } = await sharp(source, { page, pages: 1 })
    .ensureAlpha()
    .resize(GRID, GRID, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let cells = "";
  for (let i = 0; i < GRID * GRID; i++) {
    const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4);
    if (a <= ALPHA_CUTOFF) {
      cells += " ";
      continue;
    }
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    cells += Math.min(LEVELS - 1, Math.floor(luma * LEVELS));
  }
  frames.push(cells);
}

// The editor's planFrames: one frame per 1/fps slot, kept frames absorb the dropped delays
const planFrames = (fps: number) => {
  const slot = 1 / fps;
  const kept: { index: number; delay: number }[] = [];
  let time = 0;
  let nextSlot = 0;
  delays.forEach((frameDelay, index) => {
    if (time + 1e-6 >= nextSlot) {
      kept.push({ index, delay: 0 });
      while (nextSlot <= time + 1e-6) nextSlot += slot;
    }
    kept[kept.length - 1].delay += frameDelay / 100;
    time += frameDelay / 100;
  });
  return kept.map((frame) => ({
    index: frame.index,
    delay: Math.max(2, Math.round(frame.delay * 100)),
  }));
};

const dir = await mkdtemp(join(tmpdir(), "tune-peek-"));
const input = join(dir, "input.gif");
await writeFile(input, source);

const gifsicle = (args: string[]) => execFileSync("gifsicle", args, { stdio: "pipe" });

// sizes[sizeStep][fpsStep][colorStep]
const sizes: number[][][] = [];
for (const size of SIZES) {
  const bySize: number[][] = [];
  for (const fps of FPS) {
    const picked = join(dir, "frames.gif");
    gifsicle([
      "-U",
      input,
      ...planFrames(fps).flatMap(({ index, delay }) => [`-d${delay}`, `#${index}`]),
      "-o",
      picked,
    ]);
    const byFps: number[] = [];
    for (const colors of COLORS) {
      const out = join(dir, "out.gif");
      gifsicle([
        "-U",
        picked,
        "--resize-fit",
        `${size}x${size}`,
        ...(colors < 256 ? ["--colors", String(colors)] : []),
        "-O3",
        "-o",
        out,
      ]);
      byFps.push((await readFile(out)).byteLength);
    }
    bySize.push(byFps);
    console.log(`${size} px, ${fps} fps: ${byFps.join(" ")}`);
  }
  sizes.push(bySize);
}
await rm(dir, { recursive: true });

const version = execFileSync("gifsicle", ["--version"]).toString().split("\n")[0];
await writeFile(
  framesFile,
  `${JSON.stringify({ grid: GRID, levels: LEVELS, delays, frames }, null, 2)}\n`
);
await writeFile(
  sizesFile,
  `${JSON.stringify(
    {
      name: "Vibe",
      source: source.byteLength,
      width,
      height: pageHeight,
      steps: { size: SIZES, fps: FPS, colors: COLORS },
      sizes,
      measured: { date: new Date().toISOString().slice(0, 10), gifsicle: version },
    },
    null,
    2
  )}\n`
);
// Biome checks JSON too; let it lay the files out so `bun check` stays green
execFileSync("bunx", ["biome", "format", "--write", framesFile, sizesFile], {
  stdio: "ignore",
});
console.log(`wrote ${framesFile} (${frames.length} frames) and ${sizesFile}`);
