// Builds the homepage background atlas from the most popular 7TV emotes:
// - `public/emote-atlas.webp`: FRAMES pages laid out in a PAGE_GRID x PAGE_GRID grid, each
//   page an EMOTE_GRID x EMOTE_GRID grid of emotes at one point of their animation
// - `public/emote-atlas.json`: the loop duration of every emote, in seconds
// Run manually (`bun run build:emote-atlas`) and commit the output, so the page loads
// one image instead of dozens of emote requests.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const EMOTE_GRID = 8;
const FRAMES = 16;
const PAGE_GRID = 4;
const CELL = 40;
const PADDING = 4;
const FETCH_PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 5;
const MIN_LOOP_SECONDS = 0.25;
// Long animations would turn into a slideshow at FRAMES samples, so only their start is kept
const MAX_FRAME_MS = 90;
const DEFAULT_FRAME_DELAY_MS = 100;
// Pixels at or below this alpha count as background when trimming
const TRIM_ALPHA = 16;
// Emotes whose cropped cell is still mostly transparent read as noise in the background
const MIN_COVERAGE = 0.55;

// 7TV ranking, override with `--sort=<value>`. TOP_* = most added in the period,
// TRENDING_* = fastest growing (more niche). One of: TOP_DAILY, TOP_WEEKLY, TOP_MONTHLY,
// TOP_ALL_TIME, TRENDING_DAILY, TRENDING_WEEKLY, TRENDING_MONTHLY
const SORT =
  process.argv.find((arg) => arg.startsWith("--sort="))?.slice("--sort=".length) ??
  "TRENDING_MONTHLY";

const EXCLUDED_NAMES = new Set<string>([]);

const publicDir = join(import.meta.dir, "..", "public");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

type SearchResponse = {
  data?: { emotes: { search: { items: { id: string; defaultName: string }[] } } };
  errors?: { message: string }[];
};

type EmoteFrames = { name: string; frames: Buffer[]; duration: number };
type RawFrame = { data: Buffer; width: number; height: number };
type Box = { left: number; top: number; width: number; height: number };

const fetchTopEmotes = async (page: number) => {
  const response = await fetch("https://7tv.io/v4/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($page: Int!, $perPage: Int!, $sortBy: SortBy!) {
        emotes {
          search(query: null, page: $page, perPage: $perPage, sort: { sortBy: $sortBy, order: DESCENDING }) {
            items { id defaultName }
          }
        }
      }`,
      variables: { page, perPage: FETCH_PAGE_SIZE, sortBy: SORT },
    }),
  });

  const body = (await response.json()) as SearchResponse;
  if (!body.data) throw new Error(`7TV search failed: ${body.errors?.[0]?.message}`);

  return body.data.emotes.search.items.filter(
    (emote) => !EXCLUDED_NAMES.has(emote.defaultName)
  );
};

const readFrame = async (source: Buffer, page: number): Promise<RawFrame> => {
  const { data, info } = await sharp(source, { page })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
};

const findOpaqueBox = ({ data, width, height }: RawFrame): Box | null => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > TRIM_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const unionBoxes = (boxes: Box[]): Box => {
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));
  return { left, top, width: right - left, height: bottom - top };
};

// Crops to the content shared by all frames (so the animation does not jump), then fills
// the cell like `object-fit: cover`.
const renderFrame = ({ data, width, height }: RawFrame, box: Box) =>
  sharp(data, { raw: { width, height, channels: 4 } })
    .extract(box)
    .resize(CELL - PADDING * 2, CELL - PADDING * 2, { fit: "cover" })
    .png()
    .toBuffer();

const measureCoverage = async (frame: Buffer) => {
  const { channels } = await sharp(frame).stats();
  return channels[3].mean / 255;
};

// Resamples the animation at FRAMES evenly spaced moments of its loop, so every emote
// fits the same number of atlas pages while keeping its own timing via `duration`.
const fetchEmoteFrames = async (
  id: string,
  name: string
): Promise<EmoteFrames | null> => {
  const response = await fetch(`https://cdn.7tv.app/emote/${id}/2x.webp`);
  if (!response.ok) return null;

  const source = Buffer.from(await response.arrayBuffer());
  const { pages = 1, delay = [] } = await sharp(source, { animated: true }).metadata();

  const delays = Array.from(
    { length: pages },
    (_, i) => delay[i] || DEFAULT_FRAME_DELAY_MS
  );
  const total = delays.reduce((sum, value) => sum + value, 0);
  const span = Math.min(total, FRAMES * MAX_FRAME_MS);

  const sourcePages = Array.from({ length: FRAMES }, (_, frame) => {
    const time = (frame / FRAMES) * span;
    let elapsed = 0;
    for (let page = 0; page < pages; page++) {
      elapsed += delays[page];
      if (time < elapsed) return page;
    }
    return pages - 1;
  });

  const raw = new Map<number, RawFrame>();
  for (const page of new Set(sourcePages)) raw.set(page, await readFrame(source, page));

  const boxes = [...raw.values()].map(findOpaqueBox).filter((box) => box !== null);
  if (boxes.length === 0) return null;
  const box = unionBoxes(boxes);

  const rendered = new Map<number, Buffer>();
  for (const [page, frame] of raw) rendered.set(page, await renderFrame(frame, box));

  const coverages = await Promise.all([...rendered.values()].map(measureCoverage));
  const coverage = coverages.reduce((sum, value) => sum + value, 0) / coverages.length;
  if (coverage < MIN_COVERAGE) {
    console.log(`Skipped ${name}: ${Math.round(coverage * 100)}% coverage`);
    return null;
  }

  return {
    name,
    frames: sourcePages.map((page) => rendered.get(page) as Buffer),
    duration: pages > 1 ? Math.max(span / 1000, MIN_LOOP_SECONDS) : 1,
  };
};

const cells: EmoteFrames[] = [];
const seenIds = new Set<string>();

for (let page = 1; page <= MAX_FETCH_PAGES && cells.length < EMOTE_GRID ** 2; page++) {
  for (const emote of await fetchTopEmotes(page)) {
    if (cells.length === EMOTE_GRID ** 2) break;
    if (seenIds.has(emote.id)) continue;
    seenIds.add(emote.id);

    const cell = await fetchEmoteFrames(emote.id, emote.defaultName);
    if (cell) cells.push(cell);
  }
}

if (cells.length < EMOTE_GRID ** 2) {
  throw new Error(`Only ${cells.length} emotes passed the filters, lower MIN_COVERAGE`);
}

const pageSize = EMOTE_GRID * CELL;

const atlas = await sharp({
  create: {
    width: PAGE_GRID * pageSize,
    height: PAGE_GRID * pageSize,
    channels: 4,
    background: transparent,
  },
})
  .composite(
    cells.flatMap((cell, index) =>
      cell.frames.map((frame, frameIndex) => ({
        input: frame,
        left: (frameIndex % PAGE_GRID) * pageSize + (index % EMOTE_GRID) * CELL + PADDING,
        top:
          Math.floor(frameIndex / PAGE_GRID) * pageSize +
          Math.floor(index / EMOTE_GRID) * CELL +
          PADDING,
      }))
    )
  )
  .webp({ quality: 75, alphaQuality: 80 })
  .toBuffer();

await mkdir(publicDir, { recursive: true });
await writeFile(join(publicDir, "emote-atlas.webp"), atlas);
await writeFile(
  join(publicDir, "emote-atlas.json"),
  JSON.stringify({
    emoteGrid: EMOTE_GRID,
    pageGrid: PAGE_GRID,
    frames: FRAMES,
    cell: CELL,
    durations: cells.map((cell) => Number(cell.duration.toFixed(3))),
  })
);

console.log(`Atlas: ${cells.length} emotes, ${(atlas.length / 1024).toFixed(1)} KiB`);
console.log(
  cells.map((cell) => `${cell.name} (${cell.duration.toFixed(2)}s)`).join(", ")
);
