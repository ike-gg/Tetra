// Builds the emote reel of the animated logo from popular 7TV emotes that fill a square
// edge to edge (photos and full-bleed art, no transparent cut-outs):
// - `src/assets/logo/emote-reel.webp`: the emotes stacked vertically, first emote at the
//   bottom, so the strip can fall into the logo's square as one piece
// - `src/assets/logo/emote-reel.json`: the emote names, top to bottom
// The files are imported through Vite, so they get hashed names and cache forever.
// Run manually (`bun run build:logo-reel`) and commit the output.
// `--names=a,b,c` pins the emotes, first falls first. Each entry is `name[@id][:fill]`:
// without `@id` the most popular emote with exactly that name is used; `:fill` stretches
// the whole emote into the square instead of cropping it (for wide or tall emotes).

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const EMOTE_COUNT = 7;
// 2x of the largest size the reel is shown at outside the /logo showcase
const CELL = 128;
const FETCH_PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 10;
const SORT = "TOP_ALL_TIME";
const TRIM_ALPHA = 16;
// Share of opaque pixels after cropping: even rounded corners (an icon-style emote) fail
const MIN_COVERAGE = 0.995;
// Width / height of the opaque content; cropping a wide emote to a square loses too much
const MAX_ASPECT_SKEW = 1.15;

const pinned = process.argv
  .find((arg) => arg.startsWith("--names="))
  ?.slice("--names=".length)
  .split(",")
  .filter(Boolean)
  .map((entry) => {
    const [ref, mode] = entry.split(":");
    const [name, id] = ref.split("@");
    return { name, id, fill: mode === "fill" };
  });

const outDir = join(import.meta.dir, "..", "src", "assets", "logo");

type SearchResponse = {
  data?: { emotes: { search: { items: { id: string; defaultName: string }[] } } };
  errors?: { message: string }[];
};

const searchEmotes = async (page: number, query: string | null) => {
  const response = await fetch("https://7tv.io/v4/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($query: String, $page: Int!, $perPage: Int!, $sortBy: SortBy!) {
        emotes {
          search(query: $query, page: $page, perPage: $perPage, sort: { sortBy: $sortBy, order: DESCENDING }) {
            items { id defaultName }
          }
        }
      }`,
      variables: { query, page, perPage: FETCH_PAGE_SIZE, sortBy: SORT },
    }),
  });

  const body = (await response.json()) as SearchResponse;
  if (!body.data) throw new Error(`7TV search failed: ${body.errors?.[0]?.message}`);
  return body.data.emotes.search.items;
};

// First frame only: the reel moves too fast for an animation to read
const renderCell = async (id: string, name: string, strict: boolean, fill = false) => {
  const response = await fetch(`https://cdn.7tv.app/emote/${id}/4x.webp`);
  if (!response.ok) return null;
  const source = Buffer.from(await response.arrayBuffer());

  const trimmed = await sharp(source, { page: 0 })
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: TRIM_ALPHA })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!trimmed) return null;

  const { width, height } = trimmed.info;
  const skew = Math.max(width / height, height / width);
  const cell = await sharp(trimmed.data)
    .resize(CELL, CELL, { fit: fill ? "fill" : "cover" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const { channels } = await sharp(cell).stats();
  const coverage = channels[3].mean / 255;

  if (strict && (skew > MAX_ASPECT_SKEW || coverage < MIN_COVERAGE)) return null;
  console.log(`Picked ${name} (${Math.round(coverage * 100)}% coverage)`);
  return { name, cell };
};

const picked: { name: string; cell: Buffer }[] = [];

if (pinned) {
  for (const { name, id, fill } of pinned) {
    const emoteId =
      id ?? (await searchEmotes(1, name)).find((emote) => emote.defaultName === name)?.id;
    if (!emoteId) throw new Error(`No 7TV emote named ${name}`);
    const result = await renderCell(emoteId, name, false, fill);
    if (!result) throw new Error(`Could not render ${name}`);
    picked.push(result);
  }
} else {
  const seenNames = new Set<string>();
  for (let page = 1; page <= MAX_FETCH_PAGES && picked.length < EMOTE_COUNT; page++) {
    for (const emote of await searchEmotes(page, null)) {
      if (picked.length === EMOTE_COUNT) break;
      if (seenNames.has(emote.defaultName)) continue;
      seenNames.add(emote.defaultName);
      const result = await renderCell(emote.id, emote.defaultName, true);
      if (result) picked.push(result);
    }
  }
  if (picked.length < EMOTE_COUNT) {
    throw new Error(`Only ${picked.length} emotes passed the filters`);
  }
}

// The first emote falls first, so it sits at the bottom of the strip
const strip = picked.toReversed();

const reel = await sharp({
  create: {
    width: CELL,
    height: CELL * strip.length,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    strip.map(({ cell }, index) => ({ input: cell, left: 0, top: index * CELL }))
  )
  .webp({ quality: 80 })
  .toBuffer();

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "emote-reel.webp"), reel);
await writeFile(
  join(outDir, "emote-reel.json"),
  `${JSON.stringify({ names: strip.map(({ name }) => name) }, null, 2)}\n`
);

console.log(`Reel: ${strip.length} emotes, ${(reel.length / 1024).toFixed(1)} KiB`);
