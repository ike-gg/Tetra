import { useEffect, useRef } from "react";

import reel from "@/assets/logo/emote-reel.json";
import reelUrl from "@/assets/logo/emote-reel.webp";
import { cn } from "@/lib/cn";

// The emotes plus the solid block that lands last
const CELLS = reel.names.length + 1;
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// Each emote drops one cell and nearly settles before the next, so it reads as a stack of
// separate falls, not a scroll. The block gets a longer drop: it is the landing.
export const EMOTE_DROP_MS = 130;
export const BLOCK_DROP_MS = 420;
const REDUCED_FADE_MS = 200;

const DROP_DURATION_MS = reel.names.length * EMOTE_DROP_MS + BLOCK_DROP_MS;

// The strip spans CELLS squares; translateY(-k / CELLS) leaves k of them above the frame
// Fully hidden goes a few px further than -100%: at fractional sizes the strip's bottom
// edge would otherwise leave a 1px sliver of the first emote at the top of the frame
const offset = (hidden: number) =>
  hidden === CELLS
    ? `translateY(calc(-100% - 4px))`
    : `translateY(${(-hidden / CELLS) * 100}%)`;

const DROP_KEYFRAMES: Keyframe[] = Array.from({ length: CELLS + 1 }, (_, landed) => ({
  transform: offset(CELLS - landed),
  offset: landed === CELLS ? 1 : (landed * EMOTE_DROP_MS) / DROP_DURATION_MS,
  easing: EASE_OUT,
}));

// In falling order (the strip stores them top to bottom, the first to fall at the bottom)
export const LOGO_EMOTES = [...reel.names].reverse();
export const LOGO_REEL_URL = reelUrl;

type LogoProps = {
  className?: string;
  // false renders the final mark right away (the logo's resting state)
  animated?: boolean;
  // Duration multiplier, for slow-motion review on /branding/logo
  slowdown?: number;
};

// The Tetra mark: a solid square in the current text color. Animated, emotes fall into it
// one by one and the block lands last. Size it with `size-*`, color it with `text-*`.
export function Logo({ className, animated = true, slowdown = 1 }: LogoProps) {
  const stripRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const image = imageRef.current;
    if (!animated || !strip || !image) return;

    let animation: Animation | undefined;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Start only once the emotes are decoded, or the first falls would be empty squares
    void image
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        animation = reduce
          ? strip.animate(
              [
                { transform: offset(0), opacity: 0 },
                { transform: offset(0), opacity: 1 },
              ],
              { duration: REDUCED_FADE_MS * slowdown, easing: EASE_OUT, fill: "both" }
            )
          : strip.animate(DROP_KEYFRAMES, {
              duration: DROP_DURATION_MS * slowdown,
              fill: "both",
            });
      });

    return () => {
      cancelled = true;
      animation?.cancel();
    };
  }, [animated, slowdown]);

  return (
    <span
      role="img"
      aria-label="tetra"
      className={cn("relative inline-block size-8 shrink-0 overflow-hidden", className)}
    >
      {animated ? (
        <span
          ref={stripRef}
          aria-hidden
          className="absolute inset-x-0 top-0 flex flex-col"
          // Empty frame until the drop starts (also in prerendered HTML)
          style={{ height: `${CELLS * 100}%`, transform: offset(CELLS) }}
        >
          <span className="block w-full flex-1 bg-current" />
          <img
            ref={imageRef}
            src={reelUrl}
            alt=""
            draggable={false}
            decoding="async"
            className="block w-full select-none"
            style={{ height: `${((CELLS - 1) / CELLS) * 100}%` }}
          />
        </span>
      ) : (
        <span aria-hidden className="absolute inset-0 bg-current" />
      )}
    </span>
  );
}
