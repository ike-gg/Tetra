import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmoteDropText } from "@/components/emote-drop-text";
import { Logo } from "@/components/logo";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { INVITE_URL } from "@/lib/links";

// Lets the heading's rise get under way before the emotes start falling
const ACCENT_DROP_DELAY_MS = 500;

// Real 7TV emotes (the same ids as the brand guide's emote sheet), so the reply shows the
// actual image tetra would add
const DEMO_EMOTES = [
  { name: "gaga", id: "01H96150H00003CY09NFH3G999" },
  { name: "HUH", id: "01FFMS6Q4G0009CAK0J14692AY" },
  { name: "PauseChamp", id: "01F6QWHR20000EB9BSAR8G1DKZ" },
  { name: "MONKA", id: "01H876RPX8000918ZGPJMBHB7Z" },
];
const DEMO_TYPE_MS = 70;
const DEMO_SEND_MS = 350;
const DEMO_OPTIMIZE_MS = 900;
const DEMO_HOLD_MS = 2200;

const emoteImageUrl = (id: string) => `https://cdn.7tv.app/emote/${id}/2x.webp`;

type DemoPhase = "typing" | "optimizing" | "added";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// type a name → tetra optimizes it → added, then the next one. Starts on a finished reply,
// which is also what prerendered HTML and reduced motion show
function useDemoLoop() {
  const [state, setState] = useState<{ index: number; length: number; phase: DemoPhase }>(
    { index: 0, length: DEMO_EMOTES[0].name.length, phase: "added" }
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    for (const emote of DEMO_EMOTES) new Image().src = emoteImageUrl(emote.id);

    let timeout: ReturnType<typeof setTimeout>;
    const later = (ms: number, next: () => void) => {
      timeout = setTimeout(next, ms);
    };

    const type = (index: number, length: number) => {
      setState({ index, length, phase: "typing" });
      if (length < DEMO_EMOTES[index].name.length) {
        later(DEMO_TYPE_MS, () => type(index, length + 1));
        return;
      }
      later(DEMO_SEND_MS, () => {
        setState({ index, length, phase: "optimizing" });
        later(DEMO_OPTIMIZE_MS, () => {
          setState({ index, length, phase: "added" });
          later(DEMO_HOLD_MS, () => type((index + 1) % DEMO_EMOTES.length, 0));
        });
      });
    };

    later(DEMO_HOLD_MS, () => type(1, 0));
    return () => clearTimeout(timeout);
  }, []);

  const emote = DEMO_EMOTES[state.index];
  return { emote, typed: emote.name.slice(0, state.length), phase: state.phase };
}

export function Hero() {
  const { emote, typed, phase } = useDemoLoop();

  return (
    <section className="relative isolate flex min-h-svh items-center justify-center px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_45%,var(--color-background)_20%,transparent_100%)] opacity-90"
      />

      <div className="flex max-w-3xl flex-col items-center text-center">
        <Heading
          level={1}
          className="motion-safe:animate-hero-rise [animation-delay:350ms]"
        >
          <span className="block">add any emote.</span>
          <Accent>
            <EmoteDropText text="that's it" delayMs={ACCENT_DROP_DELAY_MS} />
          </Accent>
        </Heading>

        <Text
          size="lg"
          tone="muted"
          className="motion-safe:animate-hero-rise mt-6 max-w-xl text-balance [animation-delay:500ms]"
        >
          type a name or paste a link from 7TV, BTTV or FFZ. tetra shrinks it to fit
          Discord&apos;s 256 KB limit, so there&apos;s nothing to tweak
        </Text>

        <div className="motion-safe:animate-hero-rise mt-10 flex flex-col items-center gap-3 sm:flex-row [animation-delay:650ms]">
          <Button
            variant="primary"
            size="lg"
            glow
            render={<a href={INVITE_URL} data-track-location="hero" />}
          >
            add to discord
            <span aria-hidden className="font-mono group-hover/button:translate-x-0.5">
              →
            </span>
          </Button>
          <Button size="lg" render={<Link to="/panel" />}>
            open panel
          </Button>
        </div>

        <div
          aria-hidden
          className="motion-safe:animate-hero-rise mt-14 w-full max-w-md border border-border bg-background text-left font-mono text-sm [animation-delay:800ms]"
        >
          <div className="px-4 py-3">
            <span className="text-brand-500">/</span>
            <span className="text-foreground">addemote</span>{" "}
            <span className="text-signal">byname:</span>
            <span className="text-foreground">{typed}</span>
            <span
              className={cn(
                "ml-px inline-block h-4 w-2 translate-y-0.5 bg-brand-500",
                phase === "added" && "motion-safe:animate-hero-blink"
              )}
            />
          </div>
          <div className="flex h-14 items-center gap-3 border-border border-t px-4">
            {phase !== "typing" && (
              <>
                <Logo animated={false} className="size-5 shrink-0 text-foreground" />
                <span className="text-muted">tetra</span>
                {phase === "optimizing" ? (
                  <span className="flex items-center gap-2 text-muted">
                    <Spinner />
                    optimizing {emote.name}
                  </span>
                ) : (
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span className="truncate">added {emote.name}</span>
                    <img
                      src={emoteImageUrl(emote.id)}
                      alt=""
                      width={32}
                      height={32}
                      decoding="async"
                      className="size-8 shrink-0 object-contain"
                    />
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
