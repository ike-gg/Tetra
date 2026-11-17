import { useEffect, useRef, useState } from "react";

import { Slider } from "@/components/ui/slider";
import { ASCII_RAMP } from "@/lib/ascii";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/optimized-emotes";
import peek from "@/lib/tune-peek-sizes.json";

type PeekFrames = { grid: number; levels: number; delays: number[]; frames: string[] };

const FRAMES_URL = "/home/tune-peek.json";
// 48 cells across at full size: 6 px glyphs, the densest that still read as glyphs
const BOX_PX = 288;
// Glyphs for opaque cells, light to dense: an opaque cell is never blank
const GLYPHS = ASCII_RAMP.slice(1);
// Fewer colors, fewer ramp levels: the glyphs posterize like the palette does
const LEVELS_BY_COLORS: Record<number, number> = { 256: 9, 128: 7, 64: 5, 32: 4, 16: 3 };
const ALPHA_BUCKETS = 6;

const { size: SIZE_STEPS, fps: FPS_STEPS, colors: COLOR_STEPS } = peek.steps;
const COLORS_ASCENDING = [...COLOR_STEPS].sort((a, b) => a - b);
const MAX_SIZE = Math.max(...SIZE_STEPS);
const MAX_FPS = Math.max(...FPS_STEPS);

const measuredSize = (size: number, fps: number, colors: number) =>
  peek.sizes[SIZE_STEPS.indexOf(size)][FPS_STEPS.indexOf(fps)][
    COLOR_STEPS.indexOf(colors)
  ];

// The editor's planFrames: one frame per 1/fps slot, a kept frame shows for the time of
// the ones it replaces, so the tempo stays and only the motion gets choppier
const planFrames = (delays: number[], fps: number) => {
  const slot = 1 / fps;
  const kept: { index: number; ms: number }[] = [];
  let time = 0;
  let nextSlot = 0;
  delays.forEach((delay, index) => {
    if (time + 1e-6 >= nextSlot) {
      kept.push({ index, ms: 0 });
      while (nextSlot <= time + 1e-6) nextSlot += slot;
    }
    kept[kept.length - 1].ms += delay * 10;
    time += delay / 100;
  });
  return kept;
};

type Look = { size: number; colors: number };

function draw(canvas: HTMLCanvasElement, data: PeekFrames, frame: number, look: Look) {
  const context = canvas.getContext("2d");
  if (!context) return;
  // Up to 3×: at 6 px a glyph needs every device pixel to stay crisp
  const dpr = Math.min(window.devicePixelRatio, 3);
  const pixels = Math.round(BOX_PX * dpr);
  if (canvas.width !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, BOX_PX, BOX_PX);

  const source = data.frames[frame];
  const grid = data.grid;
  const shrink = 1 - look.size / MAX_SIZE;
  const cols = Math.max(4, Math.round((grid * look.size) / MAX_SIZE));
  // Smaller output: fewer cells, but each one bigger, so the emote gets coarse and chunky
  const cell = (BOX_PX / grid) * (1 + shrink * 0.9);
  const offset = (BOX_PX - cols * cell) / 2;
  const levels = LEVELS_BY_COLORS[look.colors] ?? GLYPHS.length;
  const ratio = grid / cols;

  context.font = `700 ${cell}px "Geist Mono", ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const buckets: { x: number; y: number; glyph: string }[][] = Array.from(
    { length: ALPHA_BUCKETS },
    () => []
  );
  for (let row = 0; row < cols; row++) {
    for (let col = 0; col < cols; col++) {
      // Area average of the source cells this cell covers
      let opaque = 0;
      let luma = 0;
      let count = 0;
      const y0 = Math.floor(row * ratio);
      const y1 = Math.max(y0 + 1, Math.floor((row + 1) * ratio));
      const x0 = Math.floor(col * ratio);
      const x1 = Math.max(x0 + 1, Math.floor((col + 1) * ratio));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          count++;
          const char = source[y * grid + x];
          if (char === " ") continue;
          opaque++;
          luma += (Number(char) + 0.5) / data.levels;
        }
      }
      if (opaque * 2 < count) continue;
      const level = Math.min(levels - 1, Math.floor((luma / opaque) * levels));
      const density = levels === 1 ? 1 : level / (levels - 1);
      const glyph = GLYPHS[Math.round(density * (GLYPHS.length - 1))];
      const bucket = Math.min(ALPHA_BUCKETS - 1, Math.floor(density * ALPHA_BUCKETS));
      buckets[bucket].push({
        x: offset + (col + 0.5) * cell,
        y: offset + (row + 0.5) * cell,
        glyph,
      });
    }
  }
  buckets.forEach((glyphs, bucket) => {
    context.fillStyle = `rgba(250, 250, 249, ${0.35 + (0.65 * bucket) / (ALPHA_BUCKETS - 1)})`;
    for (const { x, y, glyph } of glyphs) context.fillText(glyph, x, y);
  });
}

export function TunePeek({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PeekFrames | null>(null);
  const [size, setSize] = useState(MAX_SIZE);
  const [fps, setFps] = useState(MAX_FPS);
  const [colorIndex, setColorIndex] = useState(COLORS_ASCENDING.length - 1);
  const colors = COLORS_ASCENDING[colorIndex];
  const look = useRef<Look>({ size, colors });
  look.current = { size, colors };
  const frameRef = useRef(0);

  const bytes = measuredSize(size, fps, colors);
  const fits = bytes <= DISCORD_EMOTE_LIMIT;

  // The frames load once the peek is close to the screen, not with the page
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void Promise.all([
          fetch(FRAMES_URL).then((response) => response.json() as Promise<PeekFrames>),
          document.fonts.ready,
        ])
          .then(([frames]) => {
            if (!cancelled) setData(frames);
          })
          .catch(() => undefined);
      },
      { rootMargin: "400px" }
    );
    observer.observe(root);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  // Every slider step redraws at once, while the thumb is still moving
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && data) draw(canvas, data, frameRef.current, { size, colors });
  }, [data, size, colors]);

  // One rAF loop at the chosen frame rate, only while on screen and the tab is visible
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || !data) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const plan = planFrames(data.delays, fps);
    let step = Math.max(
      0,
      plan.findLastIndex((frame) => frame.index <= frameRef.current)
    );
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let onScreen = false;

    const tick = (now: number) => {
      elapsed += last ? now - last : 0;
      last = now;
      let changed = false;
      while (elapsed >= plan[step].ms) {
        elapsed -= plan[step].ms;
        step = (step + 1) % plan.length;
        changed = true;
      }
      if (changed) {
        frameRef.current = plan[step].index;
        draw(canvas, data, frameRef.current, look.current);
      }
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (onScreen && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [data, fps]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "grid gap-8 bg-background p-4 sm:p-8 md:grid-cols-[auto_1fr]",
        className
      )}
    >
      <div
        className="mx-auto aspect-square w-full max-w-72 bg-checker md:mx-0 md:w-72"
        aria-hidden
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4 font-mono text-muted text-xs tracking-widest">
          <span>{peek.name} in the editor</span>
          <span>{fits ? "fits in 256 KB" : "drag to fit it"}</span>
        </div>

        <Slider
          label="size"
          value={size}
          onValueChange={setSize}
          min={Math.min(...SIZE_STEPS)}
          max={MAX_SIZE}
          step={SIZE_STEPS[0] - SIZE_STEPS[1]}
          format={(value) => `${value} px`}
        />
        <Slider
          label="frame rate"
          value={fps}
          onValueChange={setFps}
          min={Math.min(...FPS_STEPS)}
          max={MAX_FPS}
          step={FPS_STEPS[0] - FPS_STEPS[1]}
          format={(value) => `${value} fps`}
        />
        <Slider
          label="colors"
          value={colorIndex}
          onValueChange={setColorIndex}
          min={0}
          max={COLORS_ASCENDING.length - 1}
          step={1}
          format={(value) => String(COLORS_ASCENDING[value])}
        />

        <div className="mt-1 flex flex-col gap-2">
          <p className="m-0 font-mono text-sm tabular-nums">
            <span className="text-muted">{formatBytes(peek.source)} → </span>
            <span className={fits ? "text-foreground" : "text-primary"}>
              {formatBytes(bytes)}
            </span>
          </p>
          <span aria-hidden className="relative block h-2">
            <span
              className={cn(
                "absolute inset-y-0 left-0",
                fits ? "bg-foreground" : "bg-primary"
              )}
              style={{ width: `${Math.min(1, bytes / peek.source) * 100}%` }}
            />
            <span
              className="absolute -inset-y-1 w-px bg-muted"
              style={{ left: `${(DISCORD_EMOTE_LIMIT / peek.source) * 100}%` }}
            />
          </span>
          <p className="m-0 font-mono text-muted text-xs tracking-widest">
            real sizes from the editor&apos;s settings · Discord&apos;s limit, 256 KB
          </p>
        </div>
      </div>
    </div>
  );
}
