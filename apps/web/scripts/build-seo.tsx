// Runs after `vite build` (part of the `build` script) and writes into dist/client:
// - robots.txt and sitemap.xml for SITE_URL (`VITE_SITE_URL`)
// - og/<page>.png, a 1200×630 Open Graph image for every page in SEO_PAGES
// The images are drawn with satori (JSX → SVG) and rasterized with resvg. Everything is
// seeded, so the same input gives byte-identical files.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori, { type Font } from "satori";
import { decompress } from "wawoff2";

import {
  absoluteUrl,
  OG_IMAGE_SIZE,
  ogImagePath,
  SEO_PAGES,
  type SeoPageKey,
  SITE_URL,
} from "../src/lib/seo";

const outDir = join(import.meta.dir, "..", "dist", "client");

// --- robots.txt + sitemap.xml ---------------------------------------------------------

// Google picks the longest matching rule, so `Allow: /panel/$` (the shell) beats
// `Disallow: /panel/`, and `/panel` and `/editor` match no Disallow at all.
const robots = `User-agent: *
Allow: /
Allow: /panel/$
Allow: /editor/$
Disallow: /panel/
Disallow: /editor/

Sitemap: ${SITE_URL}/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(SEO_PAGES)
  .map((page) => `  <url><loc>${absoluteUrl(page.path)}</loc></url>`)
  .join("\n")}
</urlset>
`;

// --- colors ---------------------------------------------------------------------------

// resvg doesn't read oklch(), so the brand tokens from app.css are converted here
function oklch(l: number, c: number, h: number, alpha = 1) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const [r, g, bl] = linear.map((v) => {
    const x = Math.min(1, Math.max(0, v));
    const srgb = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  });
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

const COLORS = {
  background: oklch(0.145, 0.003, 38),
  foreground: oklch(0.97, 0.003, 38),
  muted: oklch(0.708, 0.007, 38),
  primary: oklch(0.655, 0.214, 38),
  texture: oklch(0.708, 0.007, 38, 0.16),
};

// --- fonts ----------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const geistDir = join(dirname(require.resolve("geist/package.json")), "dist", "fonts");
const font = (path: string) => readFile(join(geistDir, path));

const [sansRegular, sansSemiBold, sansBlack, mono, serif] = await Promise.all([
  font("geist-sans/Geist-Regular.ttf"),
  font("geist-sans/Geist-SemiBold.ttf"),
  font("geist-sans/Geist-Black.ttf"),
  font("geist-mono/GeistMono-Regular.ttf"),
  // Geist Serif ships only as woff2, which satori can't read
  font("geist-serif/GeistSerif-Regular.woff2").then(async (woff2) =>
    Buffer.from(await decompress(woff2))
  ),
]);

const FONTS: Font[] = [
  { name: "Geist", data: sansRegular, weight: 400, style: "normal" },
  { name: "Geist", data: sansSemiBold, weight: 600, style: "normal" },
  { name: "Geist", data: sansBlack, weight: 900, style: "normal" },
  { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
  { name: "Geist Serif", data: serif, weight: 400, style: "normal" },
];

const svg = (node: ReactNode, width: number, height: number) =>
  satori(node, { width, height, fonts: FONTS });

// --- ASCII grid -----------------------------------------------------------------------

const RAMP = " .:-=+*#%@";
const { width: W, height: H } = OG_IMAGE_SIZE;
const GLYPH_SIZE = 11;
// Geist Mono advances 0.6em
const CELL_W = GLYPH_SIZE * 0.6;
const CELL_H = 13;
const COLS = Math.ceil(W / CELL_W);
const ROWS = Math.ceil(H / CELL_H);

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(seed: number, gridW: number, gridH: number) {
  const random = mulberry32(seed);
  const lattice = Array.from({ length: (gridW + 2) * (gridH + 2) }, random);
  const at = (x: number, y: number) => lattice[y * (gridW + 2) + x];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

// Soft blobs of ramp glyphs, quieter behind the text in the bottom left
function texture(seed: number): string[][] {
  const coarse = valueNoise(seed, 12, 8);
  const fine = valueNoise(seed + 1, 40, 20);
  const random = mulberry32(seed + 2);
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => {
      const u = col / COLS;
      const v = row / ROWS;
      const n = 0.7 * coarse(u * 10, v * 6) + 0.3 * fine(u * 38, v * 18);
      const calm = Math.min(1, Math.hypot((1 - u) * 1.1, v * 1.4) * 0.95);
      const density = Math.max(0, (n - 0.35) * 1.9) * calm + (random() - 0.5) * 0.12;
      const index = Math.round(Math.min(1, Math.max(0, density)) * (RAMP.length - 1));
      return RAMP[index];
    })
  );
}

// "tetra" rasterized from heavy Geist and sampled once per cell, as on the homepage's
// closing call to action: mono letters were too coarse at this size
async function wordCoverage(word: string, rows: number) {
  const size = 400;
  const width = size * 4;
  const height = Math.round(size * 1.2);
  const image = new Resvg(
    await svg(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          fontFamily: "Geist",
          fontWeight: 900,
          fontSize: size,
          letterSpacing: "-0.04em",
          color: "#fff",
        }}
      >
        {word}
      </div>,
      width,
      height
    )
  ).render();
  // `pixels` copies the whole buffer on every read
  const pixels = image.pixels;
  const alpha = (x: number, y: number) => pixels[(y * width + x) * 4 + 3] / 255;

  let [left, top, right, bottom] = [width, height, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha(x, y) > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  const boxW = right - left + 1;
  const boxH = bottom - top + 1;
  const cols = Math.round(((rows * boxW) / boxH) * (CELL_H / CELL_W));
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const x0 = left + Math.floor((col * boxW) / cols);
      const x1 = left + Math.floor(((col + 1) * boxW) / cols);
      const y0 = top + Math.floor((row * boxH) / rows);
      const y1 = top + Math.floor(((row + 1) * boxH) / rows);
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += alpha(x, y);
      return sum / Math.max(1, (x1 - x0) * (y1 - y0));
    })
  );
}

const WORD_ROWS = 13;
const WORD_TOP = 4;
const WORD_RIGHT = 9;
const word = await wordCoverage("tetra", WORD_ROWS);
const wordCols = word[0].length;

// --- image ----------------------------------------------------------------------------

function Grid({ rows, color }: { rows: string[]; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist Mono",
        fontSize: GLYPH_SIZE,
        lineHeight: `${CELL_H}px`,
        color,
      }}
    >
      {rows.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are fixed and never reorder
        <div key={index} style={{ display: "flex", height: CELL_H, whiteSpace: "pre" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function OgImage({ pageKey, seed }: { pageKey: SeoPageKey; seed: number }) {
  const page = SEO_PAGES[pageKey];
  const index = String(Object.keys(SEO_PAGES).indexOf(pageKey) + 1).padStart(2, "0");
  const field = texture(seed);
  const letters = field.map((line) => line.map(() => " "));
  const originCol = COLS - WORD_RIGHT - wordCols;

  word.forEach((line, row) => {
    line.forEach((coverage, col) => {
      if (coverage < 0.15) return;
      letters[WORD_TOP + row][originCol + col] = RAMP[4 + Math.round(coverage * 4)];
      field[WORD_TOP + row][originCol + col] = " ";
    });
  });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: W,
        height: H,
        backgroundColor: COLORS.background,
      }}
    >
      <Grid rows={field.map((line) => line.join(""))} color={COLORS.texture} />
      <Grid rows={letters.map((line) => line.join(""))} color={COLORS.primary} />

      <div
        style={{
          position: "absolute",
          top: 64,
          left: 72,
          width: 44,
          height: 44,
          backgroundColor: COLORS.foreground,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 68,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 22,
            letterSpacing: "0.08em",
            color: COLORS.primary,
          }}
        >
          {`[${index}] / ${page.og.eyebrow}`}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            marginTop: 20,
            fontFamily: "Geist",
            fontWeight: 600,
            fontSize: 84,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: COLORS.foreground,
          }}
        >
          <span>{page.og.heading}</span>
          {"accent" in page.og && (
            <span
              style={{
                marginLeft: 22,
                fontFamily: "Geist Serif",
                fontWeight: 400,
                fontSize: 90,
                letterSpacing: "-0.02em",
                color: COLORS.primary,
              }}
            >
              {page.og.accent}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            maxWidth: 960,
            fontFamily: "Geist",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
            color: COLORS.muted,
          }}
        >
          {page.description}
        </div>
      </div>
    </div>
  );
}

await mkdir(join(outDir, "og"), { recursive: true });
await writeFile(join(outDir, "robots.txt"), robots);
await writeFile(join(outDir, "sitemap.xml"), sitemap);

const keys = Object.keys(SEO_PAGES) as SeoPageKey[];
await Promise.all(
  keys.map(async (key, index) => {
    const image = new Resvg(await svg(<OgImage pageKey={key} seed={index + 1} />, W, H), {
      fitTo: { mode: "width", value: W },
    });
    await writeFile(join(outDir, ogImagePath(key).slice(1)), image.render().asPng());
  })
);

console.log(`seo: robots.txt, sitemap.xml and ${keys.length} OG images for ${SITE_URL}`);
