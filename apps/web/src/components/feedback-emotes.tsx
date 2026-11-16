import { useEffect, useMemo, useState } from "react";

import { mulberry32, ASCII_RAMP as RAMP } from "@/lib/ascii";

// Status emotes for the bot's embeds (FeedbackManager in apps/core): one ASCII pictogram per
// message type, on a transparent background with a shadow of the same glyphs. 13 characters
// per side, not the static mark's 28: these are read at about 22 px in an embed title, where
// only a coarse, bold shape survives.

export type Tint = "embed" | "mono";

const GRID = 13;
// Shapes are drawn in 16 units and sampled onto the grid
const UNIT = 16 / GRID;
const MONO = "'Geist Mono', ui-monospace, Menlo, monospace";

const COLORS = {
  white: "oklch(0.985 0.002 38)", // neutral-50
};

// The shadow: the symbol again, one cell down and right, in its own color at a quarter
const SHADOW_OFFSET = 1;
const SHADOW_OPACITY = 0.25;

const DENSE_SET = "*#%@";
// ASCII anti-aliasing: a cell the shape only partly covers gets a lighter glyph, the less
// covered the lighter, so an edge that moves thickens and thins instead of jumping a cell
const EDGE_SET = ".:-=+*";
const FULL = 0.55;
const EDGE_MIN = 0.1;
const edgeChar = (share: number) =>
  EDGE_SET[
    Math.min(
      EDGE_SET.length - 1,
      Math.floor(((share - EDGE_MIN) / (FULL - EDGE_MIN)) * EDGE_SET.length)
    )
  ];

type Point = [number, number];
// Inside test in grid units (0 to 16, y down)
type Shape = (x: number, y: number) => boolean;

const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;

// Whole grid cells, first to last column and row inclusive
const inCells = (x: number, y: number, c0: number, r0: number, c1: number, r1: number) =>
  inRect(x, y, c0 * UNIT, r0 * UNIT, (c1 + 1) * UNIT, (r1 + 1) * UNIT);

function nearSegment(
  x: number,
  y: number,
  [ax, ay]: Point,
  [bx, by]: Point,
  width: number
) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= width / 2;
}

function inTriangle(x: number, y: number, a: Point, b: Point, c: Point) {
  const side = (p: Point, q: Point) =>
    (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const [s1, s2, s3] = [side(a, b), side(b, c), side(c, a)];
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

// Bold on purpose: strokes about three characters wide, so the shape survives 22 px
const SHAPES = {
  check: (x, y) =>
    nearSegment(x, y, [2.8, 8.4], [6.4, 12], 3.4) ||
    nearSegment(x, y, [6.4, 12], [13.2, 3.8], 3.4),
  cross: (x, y) =>
    nearSegment(x, y, [3.6, 3.6], [12.4, 12.4], 3.4) ||
    nearSegment(x, y, [12.4, 3.6], [3.6, 12.4], 3.4),
  // !, ? and i are laid out in whole cells, with two empty rows between the dot and the
  // rest: one row ran the two together at 22 px
  bang: (x, y) => inCells(x, y, 5, 1, 7, 7) || inCells(x, y, 5, 10, 7, 11),
  question: (x, y) => {
    const ring = Math.abs(Math.hypot(x - 8, y - 5) - 3.4) <= 1.7;
    return (
      (ring && (y <= 5 || (x >= 8 && y <= 7.6))) ||
      inCells(x, y, 5, 6, 7, 7) ||
      inCells(x, y, 5, 10, 7, 11)
    );
  },
  info: (x, y) =>
    inCells(x, y, 5, 1, 7, 2) ||
    inCells(x, y, 5, 5, 7, 11) ||
    inCells(x, y, 4, 5, 4, 6) ||
    inCells(x, y, 4, 11, 8, 11),
  play: (x, y) => inTriangle(x, y, [3.6, 1.8], [3.6, 14.2], [14.2, 8]),
  diamond: (x, y) => Math.abs(x - 8) + Math.abs(y - 8) <= 6.8,
  block: (x, y) => inRect(x, y, 3.2, 3.2, 12.8, 12.8),
} satisfies Record<string, Shape>;

// Supersampled share of a cell inside the shape
function coverage(shape: Shape, col: number, row: number) {
  const steps = 6;
  let inside = 0;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      if (shape((col + (i + 0.5) / steps) * UNIT, (row + (j + 0.5) / steps) * UNIT))
        inside++;
    }
  }
  return inside / (steps * steps);
}

const pick = (set: string, value: number) => set[Math.floor(value * set.length)];

type Glyph = { char: string; color: string; weight: number; opacity: number };
// null is an empty, transparent cell
type Frame = (Glyph | null)[][];

function emptyFrame(seed: number): { frame: Frame; values: number[][] } {
  const random = mulberry32(seed);
  const values = Array.from({ length: GRID }, () => Array.from({ length: GRID }, random));
  const frame: Frame = values.map((line) => line.map(() => null));
  return { frame, values };
}

// Shadow under every symbol cell, only where the symbol leaves the cell empty; its glyphs
// are the dense random picks of the cells it falls on, so it reads as ASCII, not a blur
function withShadow(frame: Frame, values: number[][], color: string): Frame {
  const shadowed = frame.map((line) => [...line]);
  frame.forEach((line, row) => {
    line.forEach((glyph, col) => {
      const [r, c] = [row + SHADOW_OFFSET, col + SHADOW_OFFSET];
      if (!glyph || r >= GRID || c >= GRID || frame[r][c]) return;
      shadowed[r][c] = {
        char: pick(DENSE_SET, values[r][c]),
        color,
        weight: 900,
        opacity: SHADOW_OPACITY,
      };
    });
  });
  return shadowed;
}

// Dense glyphs where a cell is mostly covered, a lighter `+` on the anti-aliased edge
function shapeFrame(shape: Shape, color: string, seed: number): Frame {
  const { frame, values } = shapeCells(shape, color, seed);
  return withShadow(frame, values, color);
}

// The same without the shadow, for frames that are put together from several layers
function shapeCells(shape: Shape, color: string, seed: number) {
  const { frame, values } = emptyFrame(seed);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const share = coverage(shape, col, row);
      if (share < EDGE_MIN) continue;
      frame[row][col] = {
        char: share >= FULL ? pick(DENSE_SET, values[row][col]) : edgeChar(share),
        color,
        weight: 900,
        opacity: 1,
      };
    }
  }
  return { frame, values };
}

// Working: a run of shapes, each handed to the next by a different move, so the wait never
// repeats a trick. Spinner arc → its tail stops, the head runs round and it floods into a
// disc → squares off → flips over in 3D to a triangle → squashes flat and pops open as a
// diamond → winds up and collapses to a point → the spinner grows out of the point. Distances are signed (negative inside), in 16 units
// around the middle, y up.
type Distance = (x: number, y: number) => number;

// Strong in-out for morphs and turns: a quick middle, so each move reads as one gesture
const easeInOut = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
const easeIn = (t: number) => t ** 3;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
// Overshoots a little past 1 and settles: a pop on arrival
const easeOutBack = (t: number, overshoot = 1.4) =>
  1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Regular polygon with a vertex straight up, after Inigo Quilez's 2D distance functions
function polygon(x: number, y: number, radius: number, sides: number) {
  const half = Math.PI / sides;
  const angle = Math.atan2(x, y);
  const local = (((angle % (2 * half)) + 2 * half) % (2 * half)) - half;
  const length = Math.hypot(x, y);
  const px = length * Math.cos(local) - radius * Math.cos(half);
  let py = length * Math.abs(Math.sin(local)) - radius * Math.sin(half);
  py += Math.max(0, Math.min(radius * Math.sin(half), -py));
  return Math.hypot(px, py) * Math.sign(px);
}

const rotate = (x: number, y: number, turns: number): [number, number] => {
  const a = 2 * Math.PI * turns;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

const box = (x: number, y: number, half: number) => {
  const [qx, qy] = [Math.abs(x) - half, Math.abs(y) - half];
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
};

const STROKE = 2.3;
const RING_RADIUS = 5.4;
const RING: Distance = (x, y) => Math.hypot(x, y) - RING_RADIUS;
const TRIANGLE: Distance = (x, y) => polygon(x, y + 1.2, 7.4, 3);
const DIAMOND: Distance = (x, y) => polygon(x, y, 7, 4);

const outline =
  (d: Distance, stroke = STROKE): Distance =>
  (x, y) =>
    Math.abs(d(x, y)) - stroke / 2;
const turned =
  (d: Distance, turns: number): Distance =>
  (x, y) =>
    d(...rotate(x, y, turns));
const scaled =
  (d: Distance, k: number): Distance =>
  (x, y) =>
    d(x / k, y / k) * k;
const solid =
  (d: Distance): Shape =>
  (x, y) =>
    d(x - 8, 8 - y) <= 0;

type Layer = { frame: Frame; values: number[][] };

// The spinner: an arc of the ring, `@` at the head, its tail thinning down the ramp; a
// length of one turn or more is the closed ring, dense all round
function arcCells(
  head: number,
  length: number,
  color: string,
  seed: number,
  size = 1
): Layer {
  const { frame, values } = emptyFrame(seed);
  const band = outline(scaled(RING, size));
  const steps = 5;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      let inside = 0;
      let reach = 0;
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const x = (col + (i + 0.5) / steps) * UNIT - 8;
          const y = 8 - (row + (j + 0.5) / steps) * UNIT;
          if (band(x, y) > 0) continue;
          // How far behind the head, in turns, clockwise from the top
          const angle = Math.atan2(x, y) / (2 * Math.PI);
          const behind = (((head - angle) % 1) + 1) % 1;
          if (length < 1 && behind > length) continue;
          inside++;
          reach += length < 1 ? 1 - behind / length : 1;
        }
      }
      const share = inside / (steps * steps);
      if (share < EDGE_MIN) continue;
      const index = Math.max(
        2,
        Math.min(9, Math.floor((reach / inside) * 6 + values[row][col] * 4))
      );
      frame[row][col] = {
        char: share >= FULL ? RAMP[index] : edgeChar(share),
        color,
        weight: 900,
        opacity: 1,
      };
    }
  }
  return { frame, values };
}

type Matrix = number[][];
const multiply = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0))
  );
const rotX = (a: number): Matrix => [
  [1, 0, 0],
  [0, Math.cos(a), -Math.sin(a)],
  [0, Math.sin(a), Math.cos(a)],
];
const rotY = (a: number): Matrix => [
  [Math.cos(a), 0, Math.sin(a)],
  [0, 1, 0],
  [-Math.sin(a), 0, Math.cos(a)],
];
const rotZ = (a: number): Matrix => [
  [Math.cos(a), -Math.sin(a), 0],
  [Math.sin(a), Math.cos(a), 0],
  [0, 0, 1],
];
const CAMERA = 34;

// A flat card turning over in 3D (with a tip towards the viewer and a little roll mid-turn),
// `front` on one side and `back` on the other; every cell is ray-cast onto the card, and
// glyphs thin down the ramp as it turns away
function flipCells(
  front: Distance,
  back: Distance,
  progress: number,
  color: string,
  seed: number
): Layer {
  const { frame, values } = emptyFrame(seed);
  const swell = Math.sin(Math.PI * progress);
  const rotation = multiply(
    rotZ(0.3 * swell),
    multiply(rotX(0.55 * swell), rotY(Math.PI * progress))
  );
  const normal = [rotation[0][2], rotation[1][2], rotation[2][2]];
  const shade = Math.abs(normal[2]);
  const side = normal[2] >= 0 ? front : back;
  const steps = 5;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      let inside = 0;
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const direction = [
            (col + (i + 0.5) / steps) * UNIT - 8,
            8 - (row + (j + 0.5) / steps) * UNIT,
            -CAMERA,
          ];
          const along =
            direction[0] * normal[0] +
            direction[1] * normal[1] +
            direction[2] * normal[2];
          if (Math.abs(along) < 1e-6) continue;
          const t = -(CAMERA * normal[2]) / along;
          const point = [t * direction[0], t * direction[1], CAMERA + t * direction[2]];
          const u =
            rotation[0][0] * point[0] +
            rotation[1][0] * point[1] +
            rotation[2][0] * point[2];
          const v =
            rotation[0][1] * point[0] +
            rotation[1][1] * point[1] +
            rotation[2][1] * point[2];
          // The back is mirrored: flip x to read it the right way round
          if (side(normal[2] >= 0 ? u : -u, v) <= 0) inside++;
        }
      }
      const share = inside / (steps * steps);
      if (share < EDGE_MIN) continue;
      const index = Math.max(
        1,
        Math.min(9, Math.floor(shade * 6 + values[row][col] * 4))
      );
      frame[row][col] = {
        char: share >= FULL ? RAMP[index] : edgeChar(share),
        color,
        weight: 900,
        opacity: 1,
      };
    }
  }
  return { frame, values };
}

const solidCells = (d: Distance, color: string, seed: number) =>
  shapeCells(solid(d), color, seed);

const ARC_MIN = 0.25;
export const MORPH_FRAME_MS = 40;

// The ring flooding inward from its stroke into a full disc
const flooded =
  (fill: number): Distance =>
  (x, y) => {
    const d = RING(x, y);
    return Math.max(d - STROKE / 2, -(d + STROKE / 2 + fill));
  };
const DISC_RADIUS = RING_RADIUS + STROKE / 2;
const DISC = flooded(8);
// Nine cells wide, its edges on cell boundaries so the held square is crisp; close to the
// disc's area, so squaring off doesn't read as shrinking
const SQUARE_HALF = 8 - 2 * UNIT;
const SOLID_SQUARE: Distance = (x, y) => box(x, y, SQUARE_HALF);

// Disc to square as one shape, |x|^p + |y|^p <= r^p: p = 2 is the disc, p large the square;
// p grows exponentially so the corners sharpen evenly
const squircle =
  (t: number): Distance =>
  (x, y) => {
    const p = 2 * 8 ** t;
    return (
      (Math.abs(x) ** p + Math.abs(y) ** p) ** (1 / p) - lerp(DISC_RADIUS, SQUARE_HALF, t)
    );
  };

// Squashed vertically: a turn about the horizontal axis, seen flat
const squashed =
  (d: Distance, k: number): Distance =>
  (x, y) =>
    d(x, y / k) * k;

// [frames, layer at progress t (0 to 1)]
const steps = (color: string, seed: number): [number, (t: number) => Layer][] => [
  // Spinner: one and a half turns, surging and easing off, the arc stretching and shrinking;
  // it ends with its tail at 0.95 turns
  [
    24,
    (t) => {
      const head = 1.5 * t + 0.06 * Math.sin(4 * Math.PI * t);
      return arcCells(
        head,
        ARC_MIN + 0.3 * Math.sin(1.5 * Math.PI * t) ** 2,
        color,
        seed
      );
    },
  ],
  // The tail stops; the head runs on round the ring until it meets it
  [
    9,
    (t) => {
      const head = lerp(1.5, 1.95, easeOut(t));
      return arcCells(head, head - 0.95, color, seed);
    },
  ],
  // And the ring floods into a disc at once
  [6, (t) => solidCells(flooded(8 * easeOutExpo(t)), color, seed)],
  [2, () => solidCells(DISC, color, seed)],
  // Squares off
  [10, (t) => solidCells(squircle(easeInOut(t)), color, seed)],
  [2, () => solidCells(SOLID_SQUARE, color, seed)],
  // Flips over in 3D: a triangle on the back
  [12, (t) => flipCells(SOLID_SQUARE, TRIANGLE, easeInOut(t), color, seed)],
  [3, () => solidCells(TRIANGLE, color, seed)],
  // Squashes flat, faster and faster, and pops open as a diamond
  [
    10,
    (t) =>
      t < 0.5
        ? solidCells(squashed(TRIANGLE, Math.max(0.06, 1 - easeIn(2 * t))), color, seed)
        : solidCells(
            squashed(DIAMOND, Math.max(0.06, easeOutBack(2 * t - 1))),
            color,
            seed
          ),
  ],
  [3, () => solidCells(DIAMOND, color, seed)],
  // Winds up a touch, then collapses to a point, spinning faster as it goes
  [
    9,
    (t) => {
      const size =
        t < 0.3 ? 1 + 0.1 * easeOut(t / 0.3) : 1.1 * (1 - easeIn((t - 0.3) / 0.7));
      return solidCells(
        scaled(turned(DIAMOND, 0.5 * easeIn(t)), Math.max(0.02, size)),
        color,
        seed
      );
    },
  ],
  // The spinner grows out of the point, whirling in and settling into its turn where the
  // loop starts
  [
    10,
    (t) =>
      arcCells(
        lerp(0.3, 1, easeOut(t)),
        ARC_MIN,
        color,
        seed,
        Math.max(0.05, easeOutBack(t))
      ),
  ],
];

function morphFrames(color: string, seed: number): Frame[] {
  return steps(color, seed).flatMap(([count, layer]) =>
    Array.from({ length: count }, (_, step) => {
      const { frame, values } = layer(count > 1 ? step / (count - 1) : 1);
      return withShadow(frame, values, color);
    })
  );
}

export type FeedbackEmote = {
  id: string;
  // FeedbackManager method(s) it stands for
  methods: string[];
  // The emoji in the embed title today
  replaces: string;
  name: string;
  idea: string;
  // TetraEmbed's color for that type, so the emote matches the embed's side bar
  embedColor: string;
  // Glyph color when it shouldn't follow the embed's (the "embed colors" tint)
  glyphColor?: string;
  frames: (color: string) => Frame[];
};

const still = (shape: Shape, seed: number) => (color: string) => [
  shapeFrame(shape, color, seed),
];

export const FEEDBACK_EMOTES: FeedbackEmote[] = [
  {
    id: "working",
    methods: ["working"],
    replaces: "a random loading emote",
    name: "tetra_working",
    idea: "A run of shapes, each handed on by a different move: the spinner's tail stops, its head runs round and it floods into a disc, the disc squares off, the square flips over to a triangle, the triangle squashes flat and pops open as a diamond, the diamond winds up and collapses to a point, and the spinner grows back out of it. About 4 s a loop, the only animated one.",
    embedColor: "#0096ff",
    // White: the loop is the brand moment of the set, not a status
    glyphColor: COLORS.white,
    frames: (color) => morphFrames(color, 11),
  },
  {
    id: "success",
    methods: ["success"],
    replaces: "🟩",
    name: "tetra_success",
    idea: "A check mark.",
    embedColor: "#3acf38",
    frames: still(SHAPES.check, 12),
  },
  {
    id: "error",
    methods: ["error", "handleError", "unhandledError"],
    replaces: "<:oh:…>",
    name: "tetra_error",
    idea: "A cross.",
    embedColor: "#eb3434",
    frames: still(SHAPES.cross, 13),
  },
  {
    id: "warning",
    methods: ["warning", "rateLimited"],
    replaces: "🟨",
    name: "tetra_warning",
    idea: "An exclamation mark: something happened that you should know about.",
    embedColor: "#f7e139",
    frames: still(SHAPES.bang, 14),
  },
  {
    id: "attention",
    methods: ["attention"],
    replaces: "🟧",
    name: "tetra_attention",
    idea: "A question mark: attention embeds ask for a decision (optimization method, emote review).",
    embedColor: "#ff8812",
    frames: still(SHAPES.question, 15),
  },
  {
    id: "info",
    methods: ["info"],
    replaces: "🟦",
    name: "tetra_info",
    idea: "A serif i, square cut.",
    embedColor: "#0096ff",
    frames: still(SHAPES.info, 16),
  },
  {
    id: "panel",
    methods: ["panel"],
    replaces: "⬜",
    name: "tetra_panel",
    idea: "The Tetra square itself: the panel is the brand's home, and it already used a white square.",
    embedColor: "#ffffff",
    frames: still(SHAPES.block, 17),
  },
  {
    id: "media",
    methods: ["media"],
    replaces: "none (title only)",
    name: "tetra_media",
    idea: "A play triangle, for the media embeds.",
    embedColor: "#40c6ff",
    frames: still(SHAPES.play, 18),
  },
  {
    id: "premium",
    methods: ["premium"],
    replaces: "🟪",
    name: "tetra_premium",
    idea: "A diamond: the square turned 45°.",
    embedColor: "#9538ff",
    frames: still(SHAPES.diamond, 19),
  },
];

export const emoteColor = (emote: FeedbackEmote, tint: Tint) =>
  tint === "embed" ? (emote.glyphColor ?? emote.embedColor) : COLORS.white;

// Steps through an animated emote's frames; reduced motion keeps the first one
function useFrame(count: number) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setFrame((current) => (current + 1) % count),
      MORPH_FRAME_MS
    );
    return () => clearInterval(timer);
  }, [count]);
  return frame;
}

type EmoteProps = {
  emote: FeedbackEmote;
  tint: Tint;
  size: number;
  className?: string;
};

export function FeedbackEmoteMark({ emote, tint, size, className }: EmoteProps) {
  const frames = useMemo(() => emote.frames(emoteColor(emote, tint)), [emote, tint]);
  const frame = frames[useFrame(frames.length) % frames.length];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={size}
      height={size}
      role="img"
      aria-label={emote.name}
      className={className ?? "block shrink-0"}
    >
      {frame.map((line, row) =>
        line.map((glyph, col) =>
          glyph ? (
            <text
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid that never reorders
              key={`${col}-${row}`}
              x={col + 0.5}
              y={row + 0.5}
              fill={glyph.color}
              fillOpacity={glyph.opacity}
              fontFamily={MONO}
              fontSize={1}
              fontWeight={glyph.weight}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {glyph.char}
            </text>
          ) : null
        )
      )}
    </svg>
  );
}
