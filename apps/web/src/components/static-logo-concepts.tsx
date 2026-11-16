import { useEffect, useRef } from "react";

import { mulberry32 } from "@/lib/ascii";

export type Surface = "dark" | "light";

// Raw token values from app.css, so a mark stays self-contained when exported later
const COLORS = {
  background: "oklch(0.145 0.003 38)", // neutral-950
  wall: "oklch(0.371 0.006 38)", // neutral-700: the faint wall glyphs
  wallPixel: "oklch(0.269 0.005 38)", // neutral-800: a pixel is denser than a glyph
  square: "oklch(0.985 0.002 38)", // neutral-50: the bright square
  speck: "oklch(0.556 0.007 38)", // neutral-500: gaps between dense glyphs, as pixels
};
const MONO = "'Geist Mono', ui-monospace, Menlo, monospace";

// The classic ASCII art ramp ` .:-=+*#%@`, no letters: the light end for the wall, the
// dense end for the square, so the square reads as a block when the icon is small
const WALL_SET = ".:-=+";
const DENSE_SET = "*#%@";

type GlyphBuild = {
  kind: "glyphs";
  // Characters per row and column; the square is centered, `square` characters wide
  cols: number;
  square: number;
};

// For favicon sizes: one unit per pixel on the 16 grid, a lit pixel standing in for a glyph
type PixelBuild = { kind: "pixels"; square: number };

type Build = GlyphBuild | PixelBuild;

export type Variant = {
  id: string;
  label: string;
  // Largest first: the first build whose `from` fits the rendered size wins
  builds: { from: number; build: Build }[];
};

export type Concept = {
  letter: string;
  name: string;
  summary: string;
  pros: string[];
  cons: string[];
  variants: Variant[];
};

export const buildFor = (variant: Variant, px: number) =>
  (
    variant.builds.find(({ from }) => px >= from) ??
    variant.builds[variant.builds.length - 1]
  ).build;

type Cell = { col: number; row: number; inSquare: boolean; value: number };

function cells(cols: number, square: number, seed: number): Cell[] {
  const random = mulberry32(seed);
  const start = (cols - square) / 2;
  const end = start + square;
  const out: Cell[] = [];
  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      const inSquare = row >= start && row < end && col >= start && col < end;
      out.push({ col, row, inSquare, value: random() });
    }
  }
  return out;
}

const pick = (set: string, value: number) => set[Math.floor(value * set.length)];

// Glyphs at their natural size: the font size is the cell, nothing scaled or stretched
const glyphWeight = (inSquare: boolean) => (inSquare ? 900 : 400);

// Pixels: about a third of the wall lit, a few dark specks inside the square
const WALL_DENSITY = 0.3;
const SPECK_DENSITY = 0.1;

function GlyphMark({ build, seed }: { build: GlyphBuild; seed: number }) {
  const cell = 16 / build.cols;
  return (
    <>
      {cells(build.cols, build.square, seed).map(({ col, row, inSquare, value }) => (
        <text
          key={`${col}-${row}`}
          x={(col + 0.5) * cell}
          y={(row + 0.5) * cell}
          fill={inSquare ? COLORS.square : COLORS.wall}
          fontFamily={MONO}
          fontSize={cell}
          fontWeight={glyphWeight(inSquare)}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {pick(inSquare ? DENSE_SET : WALL_SET, value)}
        </text>
      ))}
    </>
  );
}

const pixelFill = (inSquare: boolean, value: number) => {
  if (inSquare) return value < SPECK_DENSITY ? COLORS.speck : COLORS.square;
  return value < WALL_DENSITY ? COLORS.wallPixel : null;
};

function PixelMark({ build, seed }: { build: PixelBuild; seed: number }) {
  return (
    <>
      {cells(16, build.square, seed).map(({ col, row, inSquare, value }) => {
        const fill = pixelFill(inSquare, value);
        return (
          fill && (
            <rect
              key={`${col}-${row}`}
              x={col}
              y={row}
              width={1}
              height={1}
              fill={fill}
            />
          )
        );
      })}
    </>
  );
}

// 28 characters per side. The square is an even number of characters so it stays centered;
// below 28 px each variant falls back to a pixel build with about the same share of white
const COLS = 28;
const FILLS = [
  { square: 10, pixels: 6 },
  { square: 14, pixels: 8 },
  { square: 18, pixels: 10 },
  { square: 22, pixels: 12 },
];

export const CONCEPTS: Concept[] = [
  {
    letter: "A",
    name: "Wall, dense square",
    summary:
      "Random ASCII on black, 28 characters per side, classic ASCII art characters only, at their natural size. The wall is the light end of the ramp, barely there; the square is the dense end, bright and bold. Four sizes of square, from a third of the tile to three quarters.",
    pros: [
      "Real ASCII art: the ramp ` .:-=+*#%@`, no letters, nothing scaled",
      "Centered: Discord's circle crop only takes wall",
      "Below 28 px a pixel build with the same share of white keeps the square legible",
    ],
    cons: [
      "A glyph is under 2 px until the icon is about 56 px wide: texture, not characters",
      "Text in an icon: exports need the glyphs outlined",
    ],
    variants: FILLS.map(({ square, pixels }) => ({
      id: `a-${square}`,
      label: `${COLS} cols · ${square} white · ${Math.round((square / COLS) * 100)}%`,
      builds: [
        { from: 28, build: { kind: "glyphs", cols: COLS, square } },
        { from: 0, build: { kind: "pixels", square: pixels } },
      ],
    })),
  },
];

type MarkProps = {
  variant: Variant;
  size: number;
  seed: number;
  className?: string;
};

// The mark carries its own black tile: the wall is part of the logo, on any surface
export function StaticMark({ variant, size, seed, className }: MarkProps) {
  const build = buildFor(variant, size);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering={build.kind === "pixels" ? "crispEdges" : undefined}
      role="img"
      aria-label={`Tetra, ${variant.label}`}
      className={className ?? "block shrink-0"}
    >
      <rect width={16} height={16} fill={COLORS.background} />
      {build.kind === "pixels" ? (
        <PixelMark build={build} seed={seed} />
      ) : (
        <GlyphMark build={build} seed={seed} />
      )}
    </svg>
  );
}

// Draws the mark straight into a 16×16 canvas (so glyphs use the page's Geist Mono) and
// scales it up without smoothing: what a 16 px favicon looks like on a 1x screen
export function PixelZoom({ variant, seed }: Omit<MarkProps, "size">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    let cancelled = false;
    const build = buildFor(variant, 16);
    const draw = () => {
      if (cancelled) return;
      context.fillStyle = COLORS.background;
      context.fillRect(0, 0, 16, 16);
      if (build.kind === "pixels") {
        for (const { col, row, inSquare, value } of cells(16, build.square, seed)) {
          const fill = pixelFill(inSquare, value);
          if (!fill) continue;
          context.fillStyle = fill;
          context.fillRect(col, row, 1, 1);
        }
        return;
      }
      const cell = 16 / build.cols;
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const { col, row, inSquare, value } of cells(build.cols, build.square, seed)) {
        context.fillStyle = inSquare ? COLORS.square : COLORS.wall;
        context.font = `${glyphWeight(inSquare)} ${cell}px ${MONO}`;
        context.fillText(
          pick(inSquare ? DENSE_SET : WALL_SET, value),
          (col + 0.5) * cell,
          (row + 0.5) * cell
        );
      }
    };
    void document.fonts.load(`900 10px "Geist Mono"`).then(draw, draw);
    return () => {
      cancelled = true;
    };
  }, [variant, seed]);

  return (
    <canvas
      ref={canvasRef}
      width={16}
      height={16}
      aria-hidden
      className="block size-24 [image-rendering:pixelated]"
    />
  );
}
