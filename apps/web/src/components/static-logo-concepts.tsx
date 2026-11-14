import { type ReactNode, useEffect, useRef } from "react";

export type Surface = "dark" | "light";
export type Build = "full" | "small";

// Raw token values from app.css, so a mark stays self-contained when serialized (the 1x
// preview draws it through an <img>) or exported as a favicon later
const NEUTRAL = {
  100: "oklch(0.97 0.003 38)",
  300: "oklch(0.87 0.005 38)",
  400: "oklch(0.708 0.007 38)",
  600: "oklch(0.439 0.007 38)",
  700: "oklch(0.371 0.006 38)",
  800: "oklch(0.269 0.005 38)",
  950: "oklch(0.145 0.003 38)",
};
const BRAND = "oklch(0.655 0.214 38)";
const MONO = "'Geist Mono', ui-monospace, Menlo, monospace";

type Palette = {
  ink: string;
  // One step off the ink, for a mark that should only just show on the block
  faint: string;
  glyph: string;
  checkA: string;
  checkB: string;
  brand: string;
};

const PALETTES: Record<Surface, Palette> = {
  dark: {
    ink: NEUTRAL[100],
    faint: NEUTRAL[300],
    glyph: NEUTRAL[400],
    checkA: NEUTRAL[400],
    checkB: NEUTRAL[600],
    brand: BRAND,
  },
  light: {
    ink: NEUTRAL[950],
    faint: NEUTRAL[800],
    glyph: NEUTRAL[700],
    checkA: NEUTRAL[400],
    checkB: NEUTRAL[600],
    brand: BRAND,
  },
};

type Render = (palette: Palette, px: number) => ReactNode;

export type Variant = {
  id: string;
  label: string;
  full: Render;
  // A simpler build for sizes where the full drawing breaks down
  small?: Render;
};

export type Concept = {
  letter: string;
  name: string;
  summary: string;
  smallNote?: string;
  pros: string[];
  cons: string[];
  variants: Variant[];
};

// Every mark is drawn on a 16-unit grid: one unit is one pixel at favicon size
const RAMP = " .:-=+*#%@";

const T_BAR = { x: 2, y: 3, w: 12, h: 4 };
const T_STEM = { x: 6, y: 7, w: 4, h: 6 };

const inRect = (col: number, row: number, r: typeof T_BAR) =>
  col >= r.x && col < r.x + r.w && row >= r.y && row < r.y + r.h;
const inT = (col: number, row: number) =>
  inRect(col, row, T_BAR) || inRect(col, row, T_STEM);

// Deterministic noise, so the glyph texture is the same on every render and in exports
function noise(col: number, row: number, seed = 0) {
  let h = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const GRID = Array.from({ length: 16 }, (_, index) => index);

function Glyph({
  col,
  row,
  char,
  fill,
  weight = 500,
}: {
  col: number;
  row: number;
  char: string;
  fill: string;
  weight?: number;
}) {
  return (
    <text
      x={col + 0.5}
      y={row + 0.5}
      fill={fill}
      fontFamily={MONO}
      fontSize={1.2}
      fontWeight={weight}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {char}
    </text>
  );
}

function TShape({ fill }: { fill: string }) {
  return (
    <>
      <rect x={T_BAR.x} y={T_BAR.y} width={T_BAR.w} height={T_BAR.h} fill={fill} />
      <rect x={T_STEM.x} y={T_STEM.y} width={T_STEM.w} height={T_STEM.h} fill={fill} />
    </>
  );
}

const asciiT: Render = (p) => {
  const glyphs: ReactNode[] = [];
  for (const row of GRID) {
    for (const col of GRID) {
      const r = noise(col, row, 7);
      const inside = inT(col, row);
      const edge =
        !inside &&
        [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => inT(col + dx, row + dy)));
      const char = inside
        ? "@#%"[Math.floor(r * 3)]
        : edge
          ? r < 0.35
            ? " "
            : "-=+"[Math.floor(r * 3)]
          : r < 0.6
            ? " "
            : r < 0.88
              ? "."
              : ":";
      if (char === " ") continue;
      glyphs.push(
        <Glyph
          key={`${col}-${row}`}
          col={col}
          row={row}
          char={char}
          fill={p.glyph}
          weight={inside ? 700 : 400}
        />
      );
    }
  }
  return (
    <>
      <rect width={16} height={16} fill={p.ink} />
      {glyphs}
    </>
  );
};

const asciiTSmall: Render = (p) => (
  <>
    <rect width={16} height={16} fill={p.ink} />
    <TShape fill={p.faint} />
  </>
);

// T-tetromino: 4 px cells with 1 px gaps, snapped at 16 px
const TETROMINO = [
  { x: 1, y: 4 },
  { x: 6, y: 4 },
  { x: 11, y: 4 },
];
const TETROMINO_STEM = { x: 6, y: 9 };

const tetromino =
  (stemOrange: boolean): Render =>
  (p) => (
    <>
      {TETROMINO.map((cell) => (
        <rect key={cell.x} x={cell.x} y={cell.y} width={4} height={4} fill={p.ink} />
      ))}
      <rect
        x={TETROMINO_STEM.x}
        y={TETROMINO_STEM.y}
        width={4}
        height={4}
        fill={stemOrange ? p.brand : p.ink}
      />
    </>
  );

const carved: Render = (p) => (
  <path fillRule="evenodd" fill={p.ink} d="M0 0H16V16H0Z M2 3H14V7H10V13H6V7H2Z" />
);

const carvedOrange: Render = (p) => (
  <>
    {carved(p, 16)}
    <rect x={T_STEM.x} y={T_STEM.y + 3} width={T_STEM.w} height={3} fill={p.brand} />
  </>
);

// The gap is an even number of device pixels at every size, so all four cells land on
// whole pixels: 2 px at 16–48 px, growing slowly above that
function quad(px: number) {
  const gapPx = 2 * Math.max(1, Math.round(px / 64));
  const gap = (gapPx * 16) / px;
  const cell = (16 - gap) / 2;
  return { gap, cell, far: cell + gap };
}

const block2x2 =
  (accent: "orange" | "checker" | "plain"): Render =>
  (p, px) => {
    const { cell, far } = quad(px);
    const checks = 4;
    const check = cell / checks;
    return (
      <>
        <rect x={0} y={0} width={cell} height={cell} fill={p.ink} />
        <rect x={far} y={0} width={cell} height={cell} fill={p.ink} />
        <rect x={0} y={far} width={cell} height={cell} fill={p.ink} />
        {accent === "orange" && (
          <rect x={far} y={far} width={cell} height={cell} fill={p.brand} />
        )}
        {accent === "plain" && (
          <rect x={far} y={far} width={cell} height={cell} fill={p.checkA} />
        )}
        {accent === "checker" &&
          GRID.slice(0, checks * checks).map((index) => {
            const cx = index % checks;
            const cy = Math.floor(index / checks);
            return (
              <rect
                key={index}
                x={far + cx * check}
                y={far + cy * check}
                width={check}
                height={check}
                fill={(cx + cy) % 2 === 0 ? p.checkA : p.checkB}
              />
            );
          })}
      </>
    );
  };

// Density per row: solid for the top half, then thinning out towards the bottom edge
const ditherDensity = (row: number) => (row < 8 ? 1 : (16 - row) / 9);

const ditherGlyphs: Render = (p) => {
  const glyphs: ReactNode[] = [];
  for (const row of GRID.slice(8)) {
    for (const col of GRID) {
      const jitter = (noise(col, row, 3) - 0.5) * 2.4;
      const index = Math.round(ditherDensity(row) * (RAMP.length - 1) + jitter);
      const char = RAMP[Math.min(RAMP.length - 1, Math.max(0, index))];
      if (char === " ") continue;
      glyphs.push(
        <Glyph key={`${col}-${row}`} col={col} row={row} char={char} fill={p.ink} />
      );
    }
  }
  return (
    <>
      <rect width={16} height={8} fill={p.ink} />
      {glyphs}
    </>
  );
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const ditherPixels: Render = (p) => (
  <>
    <rect width={16} height={8} fill={p.ink} />
    {GRID.slice(8).flatMap((row) =>
      GRID.filter((col) => (BAYER[row % 4][col % 4] + 0.5) / 16 < ditherDensity(row)).map(
        (col) => (
          <rect key={`${col}-${row}`} x={col} y={row} width={1} height={1} fill={p.ink} />
        )
      )
    )}
  </>
);

const cursorT: Render = (p) => (
  <>
    <rect x={3} y={3} width={2} height={10} fill={p.ink} />
    <rect x={1} y={6} width={7} height={2} fill={p.ink} />
    <rect x={5} y={11} width={3} height={2} fill={p.ink} />
    <rect x={10} y={3} width={5} height={10} fill={p.ink} />
  </>
);

const cursorCaret: Render = (p) => (
  <>
    <rect x={4} y={2} width={8} height={9} fill={p.ink} />
    <rect x={4} y={12} width={8} height={2} fill={p.brand} />
  </>
);

export const CONCEPTS: Concept[] = [
  {
    letter: "A",
    name: "ASCII T",
    summary:
      "The white square, textured with the ramp. Dense glyphs draw a T that only just shows.",
    smallNote:
      "The glyphs turn to grey noise below 96 px. The small build keeps the idea as a T one tone darker than the block.",
    pros: [
      "Same square as the animated logo's last frame",
      "Ramp and Geist Mono make it unmistakably ours at large sizes",
    ],
    cons: [
      "Glyph build is noise below 96 px",
      "Small build is low contrast, the T nearly vanishes at 16 px",
      "Glyphs depend on the font: exports need them outlined",
    ],
    variants: [{ id: "a", label: "ramp glyphs", full: asciiT, small: asciiTSmall }],
  },
  {
    letter: "B",
    name: "Tetromino T",
    summary:
      "Tetra is four. Four cells in the T-tetromino: a letter built only from squares.",
    pros: [
      "Snaps at 16 px: 4 px cells, 1 px gaps",
      "Reads as a T and as a falling block at every size",
      "The orange stem is the last block to land, one loud spot",
    ],
    cons: [
      "Drops the square silhouette of the animated mark",
      "Close to generic Tetris imagery",
    ],
    variants: [
      { id: "b-ink", label: "all foreground", full: tetromino(false) },
      { id: "b-orange", label: "orange stem", full: tetromino(true) },
    ],
  },
  {
    letter: "C",
    name: "Carved T",
    summary:
      "The white square with a T cut out of it, so the page shows through the letter.",
    pros: [
      "The animated logo's square, now with a letter",
      "Whole-unit geometry: crisp at 16, 32 and 48 px",
      "The T is a real hole, so it works on any background",
    ],
    cons: [
      "Heavy, close to a generic letter-in-a-box icon",
      "Plain variant has no orange and no ASCII",
    ],
    variants: [
      { id: "c-ink", label: "plain", full: carved },
      { id: "c-orange", label: "orange in the stem", full: carvedOrange },
    ],
  },
  {
    letter: "D",
    name: "2×2 block",
    summary:
      "The square split into four by hairline gaps. One cell is the emote that's about to land.",
    smallNote:
      "The checker needs about 48 px. The small build turns that cell into one flat grey.",
    pros: [
      "Stays a square, says four without a letter",
      "Orange cell is a strong, simple accent",
    ],
    cons: [
      "Gaps are 2 px at 16 px, which reads as a generic grid or app icon",
      "No T: it says four, not tetra",
    ],
    variants: [
      { id: "d-orange", label: "orange cell", full: block2x2("orange") },
      {
        id: "d-checker",
        label: "checker cell",
        full: block2x2("checker"),
        small: block2x2("plain"),
      },
    ],
  },
  {
    letter: "E",
    name: "Dither block",
    summary:
      "A frozen frame of the intro: solid on top, dissolving into ramp glyphs as it lands on the emotes.",
    smallNote:
      "The glyphs blur below 96 px. The small build is a 4×4 ordered dither, one unit per pixel.",
    pros: [
      "Ties the static mark to the intro and the ASCII background",
      "Pixel dither build is crisp at 16 and 32 px",
    ],
    cons: [
      "Reads as a gradient or a loading state, not a letter",
      "Two builds to maintain",
    ],
    variants: [
      { id: "e", label: "ramp / dither", full: ditherGlyphs, small: ditherPixels },
    ],
  },
  {
    letter: "F",
    name: "Cursor",
    summary: "A prompt: a mono t followed by the block as a terminal cursor.",
    pros: [
      "Pixel t stays legible at 16 px",
      "The block keeps its role, the caret variant adds orange",
    ],
    cons: [
      "Reads as a terminal app, closer to dev tools than to emotes",
      "The bare block with a caret is almost as generic as the plain square",
    ],
    variants: [
      { id: "f-t", label: "t + block", full: cursorT },
      { id: "f-caret", label: "block + caret", full: cursorCaret },
    ],
  },
];

export const autoBuild = (variant: Variant, px: number): Build =>
  variant.small && px < 96 ? "small" : "full";

type MarkProps = {
  variant: Variant;
  size: number;
  surface: Surface;
  build?: Build;
  className?: string;
};

export function StaticMark({
  variant,
  size,
  surface,
  build = "full",
  className,
}: MarkProps) {
  const render = build === "small" && variant.small ? variant.small : variant.full;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Tetra, ${variant.label}`}
      className={className ?? "block shrink-0"}
    >
      {render(PALETTES[surface], size)}
    </svg>
  );
}

// Draws the mark into a 16×16 canvas and scales it up without smoothing: what a 16 px
// favicon looks like on a 1x screen, where the page's own 16 px is still 32 on retina
export function PixelZoom({ variant, surface, build }: Omit<MarkProps, "size">) {
  const holderRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const svg = holderRef.current?.querySelector("svg");
    const context = canvasRef.current?.getContext("2d");
    if (!svg || !context) return;
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: "image/svg+xml" }));
    const image = new Image();
    let cancelled = false;
    // Revoked only once loaded: revoking in the cleanup breaks a load still in flight
    image.onload = image.onerror = () => {
      URL.revokeObjectURL(url);
      if (cancelled) return;
      context.clearRect(0, 0, 16, 16);
      context.drawImage(image, 0, 0, 16, 16);
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <span ref={holderRef} hidden>
        <StaticMark variant={variant} size={16} surface={surface} build={build} />
      </span>
      <canvas
        ref={canvasRef}
        width={16}
        height={16}
        aria-hidden
        className="block size-24 [image-rendering:pixelated]"
      />
    </>
  );
}
