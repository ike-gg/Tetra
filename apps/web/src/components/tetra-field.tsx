import { type RefObject, useEffect, useRef } from "react";

// A field of changing ASCII behind a block. The word "tetra" is never typed out: it is a
// shape the field draws, cells inside the letters switching to dense, brighter glyphs.
// One big word follows the cursor; `revealAll` grows a grid of smaller words out of
// `originRef` (the block's call to action) until they cover the field.
const LIGHT = ".:-=+";
const DENSE = "*#%@";
const FONT_SIZE = 14;
const LINE_HEIGHT = 16;
// Word heights in cells: the one under the cursor, and the tiles while revealing all
const CURSOR_WORD_ROWS = 10;
const TILE_WORD_ROWS = 7;
const TILE_GAP_COLUMNS = 6;
const TILE_GAP_ROWS = 2;
// Characters on the edge of a reveal flicker through random glyphs, like a decode
const EDGE = 16;
// Idle shimmer: every tick this share of cells picks a new glyph
const SCRAMBLE_TICK_MS = 90;
const SCRAMBLE_SHARE = 0.06;
// Time constants of the radii chasing their targets (exponential approach: an ease-out
// that retargets from wherever it is, so hover in and out can interrupt each other)
const CURSOR_TAU_MS = 90;
const ALL_TAU_MS = 180;
const IDLE_ALPHA = 0.12;
const WORD_ALPHA = 0.6;

type Mask = { columns: number; rows: number; cells: Uint8Array };

const EMPTY_MASK: Mask = { columns: 0, rows: 0, cells: new Uint8Array() };

// Rasterizes the word at one sample per character cell, so it can be drawn with glyphs.
// Cells are taller than wide, so the horizontal step is scaled to keep the word's shape.
const wordMask = (rows: number, charWidth: number): Mask => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return EMPTY_MASK;
  // Heavy sans, not the mono: its tighter, simpler letters survive the low resolution
  const font = `800 200px "Geist", ui-sans-serif, sans-serif`;
  context.font = font;
  const metrics = context.measureText("tetra");
  const ascent = metrics.actualBoundingBoxAscent;
  canvas.width = Math.ceil(metrics.width);
  canvas.height = Math.ceil(ascent + metrics.actualBoundingBoxDescent);
  context.font = font;
  context.fillText("tetra", 0, ascent);

  const { data, width } = context.getImageData(0, 0, canvas.width, canvas.height);
  const cellH = canvas.height / rows;
  const cellW = cellH * (charWidth / LINE_HEIGHT);
  const columns = Math.ceil(canvas.width / cellW);
  const cells = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = Math.min(Math.floor((column + 0.5) * cellW), canvas.width - 1);
      const y = Math.min(Math.floor((row + 0.5) * cellH), canvas.height - 1);
      cells[row * columns + column] = data[(y * width + x) * 4 + 3] > 110 ? 1 : 0;
    }
  }
  return { columns, rows, cells };
};

const inMask = (mask: Mask, column: number, row: number) =>
  column >= 0 &&
  row >= 0 &&
  column < mask.columns &&
  row < mask.rows &&
  mask.cells[row * mask.columns + column] === 1;

type TetraFieldProps = {
  revealAll: boolean;
  originRef: RefObject<HTMLElement | null>;
};

export function TetraField({ revealAll, originRef }: TetraFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealAllRef = useRef(revealAll);
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    revealAllRef.current = revealAll;
    wakeRef.current();
  }, [revealAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !area || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-brand-500")
      .trim();
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

    let columns = 0;
    let rows = 0;
    let charWidth = 8;
    let light: string[] = [];
    let dense: string[] = [];
    let cursorWord = EMPTY_MASK;
    let tileWord = EMPTY_MASK;
    const pointer: { x: number; y: number; inside: boolean } = {
      x: 0,
      y: 0,
      inside: false,
    };
    let visible = false;
    // Set on cleanup: late callbacks (fonts, observers) must not restart a loop that
    // would keep drawing over the live one
    let disposed = false;
    let cursorRadius = 0;
    let allRadius = 0;
    let frame = 0;
    let lastTime = 0;
    let lastTick = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const { width, height } = area.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.font = `${FONT_SIZE}px "Geist Mono", ui-monospace, monospace`;
      context.textBaseline = "top";
      context.fillStyle = color;
      charWidth = context.measureText("M").width;
      columns = Math.ceil(width / charWidth);
      rows = Math.ceil(height / LINE_HEIGHT);
      light = Array.from({ length: columns * rows }, () => pick(LIGHT));
      dense = Array.from({ length: columns * rows }, () => pick(DENSE));
      cursorWord = wordMask(CURSOR_WORD_ROWS, charWidth);
      tileWord = wordMask(TILE_WORD_ROWS, charWidth);
    };

    const origin = () => {
      const button = originRef.current?.getBoundingClientRect();
      const box = area.getBoundingClientRect();
      if (!button) return { x: box.width / 2, y: box.height / 2, far: 0 };
      const x = button.left + button.width / 2 - box.left;
      const y = button.top + button.height / 2 - box.top;
      // Distance to the farthest corner: the radius that covers everything
      const far = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
      return { x, y, far };
    };

    // Brick-laid grid of small words, centred on the field
    const inTile = (column: number, row: number) => {
      const pitchX = tileWord.columns + TILE_GAP_COLUMNS;
      const pitchY = tileWord.rows + TILE_GAP_ROWS;
      const offsetY = Math.floor((rows % pitchY) / 2);
      const tileRow = Math.floor((row - offsetY) / pitchY);
      const shift = (((tileRow % 2) + 2) % 2) * Math.floor(pitchX / 2);
      const offsetX = Math.floor((columns % pitchX) / 2) + shift;
      const x = (((column - offsetX) % pitchX) + pitchX) % pitchX;
      const y = (((row - offsetY) % pitchY) + pitchY) % pitchY;
      return inMask(tileWord, x, y);
    };

    const draw = () => {
      const { width, height } = area.getBoundingClientRect();
      const center = origin();
      // The cursor word snaps to the character grid, centred on the cursor
      const wordLeft = Math.round(pointer.x / charWidth - cursorWord.columns / 2);
      const wordTop = Math.round(pointer.y / LINE_HEIGHT - cursorWord.rows / 2);
      context.clearRect(0, 0, width, height);

      for (const lit of [false, true]) {
        context.globalAlpha = lit ? WORD_ALPHA : IDLE_ALPHA;
        for (let row = 0; row < rows; row++) {
          const y = row * LINE_HEIGHT;
          const cy = y + LINE_HEIGHT / 2;
          for (let column = 0; column < columns; column++) {
            const x = column * charWidth;
            const cx = x + charWidth / 2;
            const inCursor = cursorRadius - Math.hypot(cx - pointer.x, cy - pointer.y);
            const inAll = allRadius - Math.hypot(cx - center.x, cy - center.y);
            const word =
              (inCursor > 0 && inMask(cursorWord, column - wordLeft, row - wordTop)) ||
              (inAll > 0 && inTile(column, row));
            if (word !== lit) continue;

            const index = row * columns + column;
            let glyph = lit ? dense[index] : light[index];
            const edge = Math.max(inCursor, inAll);
            if (!reducedMotion && edge > 0 && edge < EDGE && Math.random() < 0.4) {
              glyph = pick(DENSE + LIGHT);
            }
            context.fillText(glyph, x, y);
          }
        }
      }
    };

    const scramble = () => {
      const count = Math.round(columns * rows * SCRAMBLE_SHARE);
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * columns * rows);
        light[index] = pick(LIGHT);
        dense[index] = pick(DENSE);
      }
    };

    const tick = (time: number) => {
      if (disposed) return;
      const dt = lastTime ? time - lastTime : 16;
      lastTime = time;
      // The cursor reveal grows until it covers the word's half-diagonal
      const wordReach = Math.hypot(
        (cursorWord.columns * charWidth) / 2,
        (cursorWord.rows * LINE_HEIGHT) / 2
      );
      // While the button reveals everything, the cursor's own word steps aside
      const cursorTarget = pointer.inside && !revealAllRef.current ? wordReach + EDGE : 0;
      const allTarget = revealAllRef.current ? origin().far + EDGE : 0;
      if (reducedMotion) {
        cursorRadius = cursorTarget;
        allRadius = allTarget;
      } else {
        cursorRadius +=
          (cursorTarget - cursorRadius) * (1 - Math.exp(-dt / CURSOR_TAU_MS));
        allRadius += (allTarget - allRadius) * (1 - Math.exp(-dt / ALL_TAU_MS));
        if (time - lastTick > SCRAMBLE_TICK_MS) {
          lastTick = time;
          scramble();
        }
      }
      draw();

      // The shimmer runs while the field is on screen; with reduced motion nothing
      // shimmers, so the loop sleeps as soon as the reveal has settled
      const settled =
        Math.abs(cursorTarget - cursorRadius) < 0.5 &&
        Math.abs(allTarget - allRadius) < 0.5;
      if (!visible || (reducedMotion && settled)) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || disposed) return;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    const onPointerMove = (event: PointerEvent) => {
      const box = area.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.inside = true;
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    // The glyphs and the word are drawn with the brand fonts; start once they have loaded
    void document.fonts.ready.then(() => {
      if (disposed) return;
      resizeObserver.observe(area);
      visibility.observe(area);
    });
    area.addEventListener("pointermove", onPointerMove);
    area.addEventListener("pointerleave", onPointerLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      wakeRef.current = () => undefined;
      resizeObserver.disconnect();
      visibility.disconnect();
      area.removeEventListener("pointermove", onPointerMove);
      area.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [originRef]);

  // No box around the field: the glyphs fade out towards every edge into the page
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_closest-side,black_45%,transparent)]"
    />
  );
}
