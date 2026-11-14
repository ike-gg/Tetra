import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { LOGO_EMOTES, LOGO_REEL_URL } from "@/components/logo";

// The logo's drop, stretched over a word: the text is cut into near-square columns, emotes
// fall through each and the column's slice of the text lands last. Every column has its
// own emotes, count, speed and start, so the columns fall and land out of step.
// The emotes fall at a constant speed; the last cell (the text coming in) decelerates
// smoothly to rest.
const MIN_EMOTES = 5;
const MAX_EMOTES = 7;
// Time for the strip to travel one cell during the fall, per column
const MIN_CELL_MS = 62;
const MAX_CELL_MS = 80;
// Each column starts somewhere in this window (after delayMs)
const MAX_START_MS = 250;
// Ease-out cubic (easings.net) starts at 3x the average speed, so over 3 cells' worth of
// fall time it picks up at the fall's own speed: no seam at the hand-off, no overshoot.
// A spring was tried and rejected: handed the fall's speed, it overshot, and the letters
// visibly bounced.
const LAND_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";
const LAND_CELLS = 3;

// Fully hidden goes a few px further than -100%: at fractional sizes the strip's bottom
// edge would otherwise leave a 1px sliver of the first emote at the top of the frame
const HIDDEN = "translateY(calc(-100% - 4px))";

// Strip positions are in cells: 0 = the text in place, -1 = the text one cell above it
const atCell = (cells: number, total: number) => `translateY(${(cells / total) * 100}%)`;

const dropKeyframes = (plan: ColumnPlan) => {
  const cells = plan.emotes.length + 1;
  const fallMs = plan.emotes.length * plan.cellMs;
  const duration = fallMs + LAND_CELLS * plan.cellMs;
  const keyframes: Keyframe[] = [
    { transform: HIDDEN, offset: 0, easing: "linear" },
    { transform: atCell(-1, cells), offset: fallMs / duration, easing: LAND_EASING },
    { transform: atCell(0, cells), offset: 1 },
  ];
  return { keyframes, duration };
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

type ColumnPlan = {
  // In falling order
  emotes: number[];
  cellMs: number;
  startMs: number;
};

const shuffled = () => {
  const order = LOGO_EMOTES.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

// When an emote fills the frame: its strip has travelled one cell per emote before it
const centeredAt = (plan: Omit<ColumnPlan, "emotes">, index: number) =>
  plan.startMs + (index + 1) * plan.cellMs;

// Two identical emotes side by side read as one wide, broken image: a neighbour must not
// show the same emote while this one is in its frame
const clashes = (plan: ColumnPlan, neighbour: ColumnPlan | undefined) =>
  neighbour !== undefined &&
  plan.emotes.some((emote, i) => {
    const j = neighbour.emotes.indexOf(emote);
    if (j < 0) return false;
    const gap = Math.abs(centeredAt(plan, i) - centeredAt(neighbour, j));
    return gap < Math.max(plan.cellMs, neighbour.cellMs) * 1.5;
  });

const planColumns = (count: number) => {
  const plans: ColumnPlan[] = [];
  for (let column = 0; column < count; column++) {
    const length = Math.round(between(MIN_EMOTES, MAX_EMOTES));
    const timing = {
      cellMs: between(MIN_CELL_MS, MAX_CELL_MS),
      startMs: between(0, MAX_START_MS),
    };
    let plan = { ...timing, emotes: shuffled().slice(0, length) };
    // Usually clash-free within a few tries; if not, a brief repeat is the lesser evil
    for (let tries = 0; tries < 100 && clashes(plan, plans[column - 1]); tries++) {
      plan = { ...timing, emotes: shuffled().slice(0, length) };
    }
    plans.push(plan);
  }
  return plans;
};

type Layout = { width: number; height: number; columns: ColumnPlan[] };

type EmoteDropTextProps = {
  text: string;
  // Waits for the surrounding entrance (the heading's rise) before the first drop
  delayMs?: number;
};

export function EmoteDropText({ text, delayMs = 0 }: EmoteDropTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    let cancelled = false;
    // The serif loads with font-display: swap; measuring before it lands cuts the
    // columns for the fallback face
    void document.fonts.ready.then(() => {
      const root = rootRef.current;
      if (cancelled || !root) return;
      // offset* ignores the heading's entrance transform
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      const count = Math.max(1, Math.round(width / height));
      setLayout({ width, height, columns: planColumns(count) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!layout) return;
    let cancelled = false;
    let animations: Animation[] = [];

    const sprite = new Image();
    sprite.src = LOGO_REEL_URL;
    void sprite
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        animations = layout.columns.flatMap((plan, column) => {
          const strip = stripRefs.current[column];
          if (!strip) return [];
          const { keyframes, duration } = dropKeyframes(plan);
          return [
            strip.animate(keyframes, {
              duration,
              delay: delayMs + plan.startMs,
              easing: "linear",
              fill: "both",
            }),
          ];
        });
        // The slices can leave hairline seams at fractional widths: once every column has
        // landed, the plain text takes over
        void Promise.all(animations.map((animation) => animation.finished))
          .then(() => setDone(true))
          .catch(() => undefined);
      });

    return () => {
      cancelled = true;
      for (const animation of animations) animation.cancel();
    };
  }, [layout, delayMs]);

  const dropping = layout !== null && !done;

  return (
    <span ref={rootRef} className="relative inline-block whitespace-nowrap">
      <span className={dropping ? "invisible" : undefined}>{text}</span>
      {dropping && <Columns layout={layout} text={text} stripRefs={stripRefs.current} />}
    </span>
  );
}

function Columns({
  layout: { width, height, columns },
  text,
  stripRefs,
}: {
  layout: Layout;
  text: string;
  stripRefs: (HTMLSpanElement | null)[];
}) {
  const columnWidth = width / columns.length;
  // Cover-fit a square emote into a column that is only roughly square
  const side = Math.max(columnWidth, height);

  return (
    <span aria-hidden className="absolute inset-0 flex">
      {columns.map((plan, column) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional columns, never reordered
        <span key={column} className="relative h-full flex-1 overflow-hidden">
          <span
            ref={(node) => {
              stripRefs[column] = node;
            }}
            className="absolute inset-x-0 top-0 flex flex-col"
            style={{ height: `${(plan.emotes.length + 1) * 100}%`, transform: HIDDEN }}
          >
            <span className="relative flex-1 overflow-hidden">
              <span
                className="absolute top-0"
                style={{ left: -column * columnWidth, width }}
              >
                {text}
              </span>
            </span>
            {/* The first to fall sits at the bottom of the strip */}
            {plan.emotes.toReversed().map((emote) => {
              // The reel image stores the emotes bottom-up
              const row = LOGO_EMOTES.length - 1 - emote;
              return (
                <span key={emote} className="relative flex-1 overflow-hidden">
                  <span
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-no-repeat"
                    style={{
                      width: side,
                      height: side,
                      backgroundImage: `url(${LOGO_REEL_URL})`,
                      backgroundSize: `100% ${LOGO_EMOTES.length * 100}%`,
                      backgroundPosition: `0 ${(row / (LOGO_EMOTES.length - 1)) * 100}%`,
                    }}
                  />
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}
