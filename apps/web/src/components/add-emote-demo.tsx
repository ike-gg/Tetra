import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BLOCK_DROP_MS, EASE_OUT } from "@/components/logo";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";
import {
  DISCORD_EMOTE_LIMIT,
  OPTIMIZED_EMOTES,
  optimizedEmoteUrl,
} from "@/lib/optimized-emotes";

// tetra's feedback emotes (assets/emotes/feedback), the pictograms of its Discord replies
const WORKING_URL = "/home/tetra-working.gif";
const SUCCESS_URL = "/home/tetra-success.png";

const TYPE_MS = 70;
const SEND_MS = 350;
const OPTIMIZE_MS = 1600;
const COUNT_STEP_MS = 50;
const HOLD_MS = 2400;
const REPLY_MS = 240;
const GAP_MS = 250;
// How far a reply rises in and sinks back out, like a new chat message
const REPLY_RISE = "translateY(8px)";

type Phase = "typing" | "optimizing" | "added" | "leaving";
type DemoState = { index: number; length: number; phase: Phase; bytes: number };

const FIRST = OPTIMIZED_EMOTES[0];
// Prerendered HTML and reduced motion: one finished reply, no loop
const INITIAL: DemoState = {
  index: 0,
  length: FIRST.name.length,
  phase: "added",
  bytes: FIRST.after,
};

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

// One timeout at a time, so pausing (off screen, hidden tab) is just holding the next step
function createStepper() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let next: (() => void) | undefined;
  let due = 0;
  let remaining = 0;
  let paused = false;

  const run = () => {
    const step = next;
    next = undefined;
    step?.();
  };

  return {
    later(ms: number, step: () => void) {
      next = step;
      remaining = ms;
      due = performance.now() + ms;
      if (!paused) timer = setTimeout(run, ms);
    },
    setPaused(value: boolean) {
      if (value === paused) return;
      paused = value;
      if (paused) {
        clearTimeout(timer);
        remaining = Math.max(0, due - performance.now());
      } else if (next) {
        due = performance.now() + remaining;
        timer = setTimeout(run, remaining);
      }
    },
    stop() {
      clearTimeout(timer);
      next = undefined;
    },
  };
}

function useDemoLoop(rootRef: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<DemoState>(INITIAL);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const url of [
      WORKING_URL,
      SUCCESS_URL,
      ...OPTIMIZED_EMOTES.map(optimizedEmoteUrl),
    ]) {
      new Image().src = url;
    }

    const stepper = createStepper();
    let onScreen = true;
    const sync = () => stepper.setPaused(!onScreen || document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);

    const count = (index: number, step: number) => {
      const emote = OPTIMIZED_EMOTES[index];
      const steps = OPTIMIZE_MS / COUNT_STEP_MS;
      const progress = easeOutCubic(step / steps);
      const bytes = Math.round(emote.before - (emote.before - emote.after) * progress);
      if (step < steps) {
        setState((current) => ({ ...current, bytes }));
        stepper.later(COUNT_STEP_MS, () => count(index, step + 1));
        return;
      }
      setState((current) => ({ ...current, phase: "added", bytes: emote.after }));
      stepper.later(HOLD_MS, () => {
        setState((current) => ({ ...current, phase: "leaving" }));
        stepper.later(REPLY_MS + GAP_MS, () =>
          type((index + 1) % OPTIMIZED_EMOTES.length, 0)
        );
      });
    };

    const type = (index: number, length: number) => {
      const emote = OPTIMIZED_EMOTES[index];
      setState({ index, length, phase: "typing", bytes: emote.before });
      if (length < emote.name.length) {
        stepper.later(TYPE_MS, () => type(index, length + 1));
        return;
      }
      stepper.later(SEND_MS, () => {
        setState((current) => ({ ...current, phase: "optimizing" }));
        count(index, 0);
      });
    };

    stepper.later(HOLD_MS, () => {
      setState((current) => ({ ...current, phase: "leaving" }));
      stepper.later(REPLY_MS + GAP_MS, () => type(1, 0));
    });

    return () => {
      stepper.stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [rootRef]);

  return state;
}

export function AddEmoteDemo({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLImageElement>(null);
  const emoteRef = useRef<HTMLImageElement>(null);
  const { index, length, phase, bytes } = useDemoLoop(rootRef);
  const emote = OPTIMIZED_EMOTES[index];
  const previous = useRef(phase);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = phase;
    if (from === phase) return;

    const reply = replyRef.current;
    if (phase === "optimizing" && reply) {
      reply.animate(
        [
          { transform: REPLY_RISE, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: REPLY_MS, easing: EASE_OUT }
      );
    }
    if (phase === "leaving" && reply) {
      reply.animate([{ transform: REPLY_RISE, opacity: 0 }], {
        duration: REPLY_MS,
        easing: EASE_OUT,
        fill: "forwards",
      });
    }
    if (phase === "added") {
      statusRef.current?.animate(
        [
          { transform: "scale(0.9)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 160, easing: EASE_OUT }
      );
      // The emote falls one cell into its slot and lands, the logo's drop
      emoteRef.current?.animate(
        [{ transform: "translateY(-100%)" }, { transform: "none" }],
        { duration: BLOCK_DROP_MS, easing: EASE_OUT }
      );
    }
  }, [phase]);

  const typed = emote.name.slice(0, length);
  const overLimit = bytes > DISCORD_EMOTE_LIMIT;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        "w-full max-w-md border border-border bg-background text-left font-mono text-sm",
        className
      )}
    >
      <div className="px-4 py-3">
        <span className="text-brand-500">/</span>
        <span className="text-foreground">addemote</span>{" "}
        <span className="text-signal">byname:</span>
        <span className="text-foreground">{typed}</span>
        <span
          className={cn(
            "ml-px inline-block h-4 w-2 translate-y-0.5 bg-brand-500",
            (phase === "added" || phase === "leaving") && "motion-safe:animate-hero-blink"
          )}
        />
      </div>
      <div className="h-14 overflow-hidden border-border border-t px-4">
        {phase !== "typing" && (
          <div ref={replyRef} className="flex h-full items-center gap-2">
            <img
              // A new element per status, so the success mark enters on its own
              key={phase === "optimizing" ? "working" : "success"}
              ref={statusRef}
              src={phase === "optimizing" ? WORKING_URL : SUCCESS_URL}
              alt=""
              width={22}
              height={22}
              className="size-[22px] shrink-0"
            />
            <span className="min-w-0 truncate text-foreground">
              {phase === "optimizing" ? "optimizing" : "added"} {emote.name}
            </span>
            <span className="shrink-0 text-muted">·</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                overLimit ? "text-primary" : "text-foreground"
              )}
            >
              {formatBytes(bytes)}
            </span>
            <span className="ml-auto block size-8 shrink-0 overflow-hidden">
              {phase !== "optimizing" && (
                <img
                  ref={emoteRef}
                  src={optimizedEmoteUrl(emote)}
                  alt=""
                  width={32}
                  height={32}
                  decoding="async"
                  className="size-8 object-contain"
                />
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
