import { useEffect, useRef } from "react";

import type { BrandChapterId } from "@/components/brand-book";
import { ASCII_RAMP, mulberry32 } from "@/lib/ascii";
import { cn } from "@/lib/cn";

// The brand book's cover: the bot avatar's ASCII cube (assets/logo/animated), alive. Every
// cell of a character grid is ray-cast against the cube and gets a ramp glyph by the light
// on the face it hits. Four faces are chapters, each with its own motif; it tumbles when
// idle, can be dragged and thrown, turns to a chapter's face when its row is hovered, and a
// click on a face opens that chapter.

type Vec = [number, number, number];
// x, y, z, w
type Quat = [number, number, number, number];
// Row-major 3×3, local → world
type Mat = number[];

const qMul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

const qNormalize = (q: Quat): Quat => {
  const length = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
};

// `axis` must be a unit vector
const qAxisAngle = (axis: Vec, angle: number): Quat => {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};

// Shortest path from a towards b
function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const to: Quat = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    return qNormalize([
      a[0] + (to[0] - a[0]) * t,
      a[1] + (to[1] - a[1]) * t,
      a[2] + (to[2] - a[2]) * t,
      a[3] + (to[3] - a[3]) * t,
    ]);
  }
  const theta = Math.acos(dot);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [
    a[0] * wa + to[0] * wb,
    a[1] * wa + to[1] * wb,
    a[2] * wa + to[2] * wb,
    a[3] * wa + to[3] * wb,
  ];
}

function qToMatrix([x, y, z, w]: Quat): Mat {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ];
}

function qFromMatrix(m: Mat): Quat {
  const trace = m[0] + m[4] + m[8];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    return [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  }
  if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    return [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  }
  const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
  return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
}

const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];

// Turned up and to the left, so the face in front shows two of its neighbours: a cube, not
// a square
const tilt = (pitch: number, yaw: number) =>
  qMul(qAxisAngle(X, pitch), qAxisAngle(Y, -yaw));

// Ink 0–1 is how dense a cell is before light; tone 0 neutral, 1 orange, 2 signal
type Paint = (u: number, v: number, random: number, time: number) => number;
type Tone = 0 | 1 | 2;

const WALL = 0.28;
const wall: Paint = () => WALL;
const inSquare = (u: number, v: number, half: number) =>
  Math.abs(u) < half && Math.abs(v) < half;

const nearSegment = (
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= width / 2;
};

// The static mark: a dense square, half the face, on the light wall
const staticMark: Paint = (u, v) => (inSquare(u, v, 0.5) ? 1 : WALL);

// The logo's reel: bands of mid-dense glyphs (the emotes) drop into the square one cell at
// a time, the way the intro's strip does
const REEL_BANDS = 3;
const REEL_STEP_S = 1.1;
const REEL_INKS = [0.55, 0.8, 0.45, 0.7, 0.62];
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const reel: Paint = (u, v, _random, time) => {
  if (!inSquare(u, v, 0.5)) return WALL;
  const step = time / REEL_STEP_S;
  const drops = Math.floor(step) + easeOut(Math.min(1, (step % 1) / 0.25));
  // Height inside the square in bands, counted from the bottom, moving down as it drops
  const position = (v + 0.5) * REEL_BANDS + drops;
  const band = Math.floor(position);
  if (position - band < 0.16) return WALL;
  return REEL_INKS[((band % REEL_INKS.length) + REEL_INKS.length) % REEL_INKS.length];
};

// The guide is the one orange face
const orange: Paint = (_u, _v, random) => 0.5 + 0.45 * random;

// Feedback: the success emote's check (feedback-emotes.tsx), in 16 units, y down
const check: Paint = (u, v) => {
  const x = 8 + u * 9;
  const y = 8 - v * 9;
  return nearSegment(x, y, 2.8, 8.4, 6.4, 12, 3.4) ||
    nearSegment(x, y, 6.4, 12, 13.2, 3.8, 3.4)
    ? 1
    : WALL;
};

type Face = {
  normal: Vec;
  // The face's own axes: right and up when it faces the viewer upright
  right: Vec;
  up: Vec;
  chapter: BrandChapterId | null;
  paint: Paint;
  // Tone of cells the paint makes denser than the wall
  tone: Tone;
};

// Indexed by axis * 2 + (negative ? 1 : 0), the order the ray cast finds them in
const FACES: Face[] = [
  { normal: [1, 0, 0], right: [0, 0, -1], up: Y, chapter: "logo", paint: reel, tone: 0 },
  {
    normal: [-1, 0, 0],
    right: [0, 0, 1],
    up: Y,
    chapter: "guide",
    paint: orange,
    tone: 1,
  },
  {
    normal: [0, 1, 0],
    right: X,
    up: [0, 0, -1],
    chapter: "feedback",
    paint: check,
    tone: 2,
  },
  { normal: [0, -1, 0], right: X, up: [0, 0, 1], chapter: null, paint: wall, tone: 0 },
  {
    normal: [0, 0, 1],
    right: X,
    up: Y,
    chapter: "static-logo",
    paint: staticMark,
    tone: 0,
  },
  { normal: [0, 0, -1], right: [-1, 0, 0], up: Y, chapter: null, paint: wall, tone: 0 },
];

const REST = tilt(0.34, 0.46);
// Turned to a face: closer to head-on than the rest pose, still clearly a cube
const facePose = (face: Face) =>
  qMul(tilt(0.2, 0.28), qFromMatrix([...face.right, ...face.up, ...face.normal]));
const FACE_POSES = new Map(
  FACES.flatMap((face) => (face.chapter ? [[face.chapter, facePose(face)] as const] : []))
);

// Idle tumble: mostly about the vertical, a little about the others, so every side face
// comes round and the top shows now and then
const IDLE_AXIS: Vec = (() => {
  const axis: Vec = [0.3, 1, 0.12];
  const length = Math.hypot(...axis);
  return [axis[0] / length, axis[1] / length, axis[2] / length];
})();
const IDLE_SPEED = 0.35;
// Time constant of the spin settling back into the idle tumble after a throw
const SETTLE_S = 1.6;
// Time constant of the turn to a hovered chapter's face: an ease-out that retargets from
// wherever the cube is, so moving down the list never jumps
const TURN_TAU_MS = 120;
// A release this long after the last move throws nothing
const THROW_WINDOW_MS = 80;
const CLICK_SLOP_PX = 6;
// rad/s: a hard flick still reads as a spin, not a blur
const MAX_THROW = 14;

const CAMERA = 8;
// Half the canvas in cube units (the cube is 2 wide); leaves room for its widest silhouette
const VIEW = 2;
const LIGHT: Vec = (() => {
  const light: Vec = [-0.45, 0.55, 0.7];
  const length = Math.hypot(...light);
  return [light[0] / length, light[1] / length, light[2] / length];
})();
const AMBIENT = 0.22;

const TEXELS = 18;
const SEED = 38;
const MAX_COLUMNS = 72;
const TARGET_COLUMNS = 46;
const ALPHA_LEVELS = 10;

type BrandCubeProps = {
  // The chapter whose face to turn to, null for the idle tumble
  focus: BrandChapterId | null;
  onOpen: (chapter: BrandChapterId) => void;
  className?: string;
};

export function BrandCube({ focus, onOpen, className }: BrandCubeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(focus);
  const onOpenRef = useRef(onOpen);
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    focusRef.current = focus;
    wakeRef.current();
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !area || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(document.documentElement);
    const TONE_COLORS = [
      styles.getPropertyValue("--color-neutral-50").trim(),
      styles.getPropertyValue("--color-brand-500").trim(),
      styles.getPropertyValue("--color-signal-400").trim(),
    ];

    const random = mulberry32(SEED);
    const texels = Float32Array.from({ length: FACES.length * TEXELS * TEXELS }, random);
    // One glyph list per tone and alpha level, so fillStyle changes 30 times a frame at most
    const buckets: number[][] = Array.from({ length: 3 * ALPHA_LEVELS }, () => []);
    let glyphs: string[] = [];

    let width = 0;
    let height = 0;
    let charWidth = 8;
    let lineHeight = 14;
    let columns = 0;
    let rows = 0;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    let rotation: Quat = REST;
    let matrix = qToMatrix(rotation);
    // Angular velocity in world space, rad/s; starts still and eases into the tumble
    let spin: Vec = [0, 0, 0];
    let drag: {
      id: number;
      x: number;
      y: number;
      travel: number;
      lastMove: number;
    } | null = null;

    let onScreen = false;
    let visible = false;
    let disposed = false;
    let frame = 0;
    let lastTime = 0;
    let clock = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const box = area.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fontSize = Math.max(9, Math.min(14, width / TARGET_COLUMNS / 0.6));
      context.font = `700 ${fontSize}px "Geist Mono", ui-monospace, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      charWidth = context.measureText("M").width;
      lineHeight = Math.round(fontSize * 1.2);
      columns = Math.min(MAX_COLUMNS, Math.floor(width / charWidth));
      rows = Math.floor(height / lineHeight);
      offsetX = (width - columns * charWidth) / 2;
      offsetY = (height - rows * lineHeight) / 2;
      scale = Math.min(width, height) / 2 / VIEW;
      glyphs = new Array(columns * rows).fill("");
    };

    // Ray from the camera through a point of the canvas, into the cube's own space; returns
    // the face hit (index into FACES) and where, or -1
    const hit = { face: -1, u: 0, v: 0 };
    const cast = (px: number, py: number) => {
      const wx = (px - width / 2) / scale;
      const wy = (height / 2 - py) / scale;
      const m = matrix;
      // Transposed matrix: world → local
      const origin = [CAMERA * m[6], CAMERA * m[7], CAMERA * m[8]];
      const direction = [
        m[0] * wx + m[3] * wy - m[6] * CAMERA,
        m[1] * wx + m[4] * wy - m[7] * CAMERA,
        m[2] * wx + m[5] * wy - m[8] * CAMERA,
      ];
      let near = Number.NEGATIVE_INFINITY;
      let far = Number.POSITIVE_INFINITY;
      let axis = -1;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(direction[i]) < 1e-9) {
          if (Math.abs(origin[i]) > 1) return -1;
          continue;
        }
        const t1 = (-1 - origin[i]) / direction[i];
        const t2 = (1 - origin[i]) / direction[i];
        const enter = Math.min(t1, t2);
        if (enter > near) {
          near = enter;
          axis = i;
        }
        far = Math.min(far, Math.max(t1, t2));
      }
      if (axis < 0 || near > far || far < 0) return -1;
      const index = axis * 2 + (direction[axis] > 0 ? 1 : 0);
      const face = FACES[index];
      const p = [
        origin[0] + near * direction[0],
        origin[1] + near * direction[1],
        origin[2] + near * direction[2],
      ];
      hit.face = index;
      hit.u = p[0] * face.right[0] + p[1] * face.right[1] + p[2] * face.right[2];
      hit.v = p[0] * face.up[0] + p[1] * face.up[1] + p[2] * face.up[2];
      return index;
    };

    const draw = () => {
      matrix = qToMatrix(rotation);
      // Light per face, scaled so a face turned straight at the viewer is full
      const light = FACES.map(({ normal }) => {
        const n = [0, 1, 2].map(
          (row) =>
            matrix[row * 3] * normal[0] +
            matrix[row * 3 + 1] * normal[1] +
            matrix[row * 3 + 2] * normal[2]
        );
        const lambert = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2];
        return AMBIENT + (1 - AMBIENT) * Math.min(1, Math.max(0, lambert));
      });
      const time = reducedMotion ? 0 : clock;

      for (const bucket of buckets) bucket.length = 0;
      for (let row = 0; row < rows; row++) {
        const py = offsetY + (row + 0.5) * lineHeight;
        for (let column = 0; column < columns; column++) {
          const px = offsetX + (column + 0.5) * charWidth;
          const cell = row * columns + column;
          let density: number;
          let tone: Tone = 0;
          if (cast(px, py) >= 0) {
            const face = FACES[hit.face];
            const tx = Math.min(TEXELS - 1, Math.floor(((hit.u + 1) / 2) * TEXELS));
            const ty = Math.min(TEXELS - 1, Math.floor(((1 - hit.v) / 2) * TEXELS));
            const value = texels[(hit.face * TEXELS + ty) * TEXELS + tx];
            const ink = face.paint(hit.u, hit.v, value, time);
            if (ink > WALL) tone = face.tone;
            density = ink * light[hit.face];
            // The cell's own random pick, as in the bot avatar: full light is the mark's
            // dense end, a face turning away thins down the ramp
            const index = Math.max(1, Math.min(9, Math.floor(density * 6 + value * 4)));
            glyphs[cell] = ASCII_RAMP[index];
          } else {
            // The silhouette, anti-aliased: corners of a missed cell that touch the cube
            let touching = 0;
            let face = -1;
            for (const [sx, sy] of CORNERS) {
              const found = cast(px + sx * charWidth, py + sy * lineHeight);
              if (found >= 0) {
                touching++;
                face = found;
              }
            }
            if (face < 0) continue;
            density = WALL * light[face] * 0.6;
            glyphs[cell] = ASCII_RAMP[touching];
          }
          const alpha = Math.min(
            ALPHA_LEVELS - 1,
            Math.floor((0.18 + 0.82 * density ** 1.3) * ALPHA_LEVELS)
          );
          buckets[tone * ALPHA_LEVELS + alpha].push(cell);
        }
      }

      context.clearRect(0, 0, width, height);
      buckets.forEach((cells, bucket) => {
        if (!cells.length) return;
        context.fillStyle = TONE_COLORS[Math.floor(bucket / ALPHA_LEVELS)];
        context.globalAlpha = ((bucket % ALPHA_LEVELS) + 1) / ALPHA_LEVELS;
        for (const cell of cells) {
          const column = cell % columns;
          const row = (cell - column) / columns;
          context.fillText(
            glyphs[cell],
            offsetX + (column + 0.5) * charWidth,
            offsetY + (row + 0.5) * lineHeight
          );
        }
      });
      context.globalAlpha = 1;
    };

    const rotateBy = (axis: Vec, angle: number) => {
      if (angle === 0) return;
      rotation = qNormalize(qMul(qAxisAngle(axis, angle), rotation));
    };

    // Is anything still moving? Reduced motion only redraws on input
    const step = (dt: number) => {
      const target = focusRef.current ? FACE_POSES.get(focusRef.current) : undefined;
      if (drag) return true;
      if (target) {
        spin = [0, 0, 0];
        if (reducedMotion) {
          rotation = target;
          return false;
        }
        rotation = qSlerp(rotation, target, 1 - Math.exp((-dt * 1000) / TURN_TAU_MS));
        return true;
      }
      if (reducedMotion) return false;
      const approach = 1 - Math.exp(-dt / SETTLE_S);
      spin = [0, 1, 2].map(
        (i) => spin[i] + (IDLE_AXIS[i] * IDLE_SPEED - spin[i]) * approach
      ) as Vec;
      const speed = Math.hypot(...spin);
      if (speed > 1e-6) {
        rotateBy([spin[0] / speed, spin[1] / speed, spin[2] / speed], speed * dt);
      }
      return true;
    };

    const tick = (time: number) => {
      if (disposed) return;
      const dt = lastTime ? Math.min(50, time - lastTime) / 1000 : 0;
      lastTime = time;
      clock += dt;
      const moving = step(dt);
      draw();
      if (!visible || !moving) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || disposed || !visible) return;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = () => {
      // Reduced motion with no loop running: settle the pose now
      if (reducedMotion && !focusRef.current && !drag) rotation = REST;
      wake();
    };

    const local = (event: { clientX: number; clientY: number }) => {
      const box = canvas.getBoundingClientRect();
      return [event.clientX - box.left, event.clientY - box.top] as const;
    };
    const faceAt = (event: { clientX: number; clientY: number }) => {
      matrix = qToMatrix(rotation);
      return cast(...local(event));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (faceAt(event) < 0) return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        travel: 0,
        lastMove: performance.now(),
      };
      spin = [0, 0, 0];
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) {
        canvas.style.cursor = faceAt(event) >= 0 ? "grab" : "";
        return;
      }
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastMove) / 1000;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.travel += distance;
      drag.lastMove = now;
      // Dragging across the cube's width turns it half a turn; right turns about +y,
      // down about +x, so the face under the pointer follows it
      const axis: Vec = [dy / distance, dx / distance, 0];
      const angle = (distance / (2 * scale)) * Math.PI;
      rotateBy(axis, angle);
      const sample = Math.min(MAX_THROW, angle / dt);
      spin = [0, 1, 2].map((i) => spin[i] * 0.5 + axis[i] * sample * 0.5) as Vec;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const { travel, lastMove } = drag;
      drag = null;
      canvas.style.cursor = faceAt(event) >= 0 ? "grab" : "";
      if (reducedMotion || performance.now() - lastMove > THROW_WINDOW_MS) {
        spin = [0, 0, 0];
      }
      if (event.type === "pointerup" && travel < CLICK_SLOP_PX) {
        const face = faceAt(event);
        const chapter = face >= 0 ? FACES[face].chapter : null;
        if (chapter) onOpenRef.current(chapter);
      }
      wake();
    };

    // A press on the cube must neither select text nor scroll the page on touch
    const onMouseDown = (event: MouseEvent) => {
      if (faceAt(event) >= 0) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && faceAt(touch) >= 0) event.preventDefault();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    // Runs only while on screen and the tab is in front
    const updateVisible = () => {
      visible = onScreen && document.visibilityState === "visible";
      wake();
    };
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      updateVisible();
    });
    // The glyphs need the brand's mono; start once it has loaded
    void document.fonts.ready.then(() => {
      if (disposed) return;
      resizeObserver.observe(area);
      visibility.observe(area);
    });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("visibilitychange", updateVisible);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      wakeRef.current = () => undefined;
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("visibilitychange", updateVisible);
    };
  }, []);

  // The space is reserved before the first draw, so the prerendered page doesn't jump
  return (
    <div className={cn("relative aspect-square w-full select-none", className)}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
    </div>
  );
}

// Where a missed cell looks for the cube's edge, in cells from its center
const CORNERS = [
  [-0.3, -0.3],
  [0.3, -0.3],
  [-0.3, 0.3],
  [0.3, 0.3],
] as const;
