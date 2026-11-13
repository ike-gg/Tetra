import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

const INVITE_URL = "https://tetra.lol/invite";

// Same ramp as the background shader, so the decode effect reads as part of it
const SCRAMBLE_GLYPHS = ".:-=+*#%@";
const SCRAMBLE_DELAY_MS = 450;
const SCRAMBLE_STEP_MS = 45;
const SCRAMBLE_STEPS_PER_CHAR = 3;

const DEMO_EMOTES = ["catJAM", "Sway", "GIGACHAD", "glorp", "NODDERS", "buh", "Aware"];
const DEMO_TYPE_MS = 70;
const DEMO_HOLD_MS = 1800;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useScramble(text: string) {
  const [output, setOutput] = useState(text);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let step = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const randomGlyph = () =>
      SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];

    setOutput(text.replace(/\S/g, randomGlyph));

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        step++;
        const resolved = Math.floor(step / SCRAMBLE_STEPS_PER_CHAR);

        setOutput(
          [...text]
            .map((char, index) =>
              index < resolved || char === " " ? char : randomGlyph()
            )
            .join("")
        );

        if (resolved >= text.length) clearInterval(interval);
      }, SCRAMBLE_STEP_MS);
    }, SCRAMBLE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text]);

  return output;
}

function useTypedEmote() {
  const [state, setState] = useState({ index: 0, length: DEMO_EMOTES[0].length });

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let timeout: ReturnType<typeof setTimeout>;

    const tick = (index: number, length: number) => {
      setState({ index, length });
      const name = DEMO_EMOTES[index];

      if (length < name.length) {
        timeout = setTimeout(() => tick(index, length + 1), DEMO_TYPE_MS);
      } else {
        timeout = setTimeout(
          () => tick((index + 1) % DEMO_EMOTES.length, 0),
          DEMO_HOLD_MS
        );
      }
    };

    timeout = setTimeout(() => tick(0, DEMO_EMOTES[0].length), DEMO_HOLD_MS);
    return () => clearTimeout(timeout);
  }, []);

  const name = DEMO_EMOTES[state.index];
  return { typed: name.slice(0, state.length), done: state.length === name.length };
}

export function Hero() {
  const accent = useScramble("emotes");
  const { typed, done } = useTypedEmote();

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
          Your chat&apos;s{" "}
          <Accent className="relative inline-block">
            <span aria-hidden className="invisible">
              emotes
            </span>
            <span aria-hidden className="absolute inset-0 font-mono font-normal">
              {accent === "emotes" ? null : accent}
            </span>
            <span
              className={`absolute inset-0 ${accent === "emotes" ? "" : "opacity-0"}`}
            >
              emotes
            </span>
          </Accent>
          , now on Discord.
        </Heading>

        <Text
          size="lg"
          tone="muted"
          className="motion-safe:animate-hero-rise mt-6 max-w-xl text-balance [animation-delay:500ms]"
        >
          Add any emote from 7TV, BTTV, FFZ or a link with one command. Tetra squeezes it
          under Discord&apos;s 256&nbsp;KB limit, so it just works.
        </Text>

        <div className="motion-safe:animate-hero-rise mt-10 flex flex-col items-center gap-3 sm:flex-row [animation-delay:650ms]">
          <Button variant="primary" size="lg" glow render={<a href={INVITE_URL} />}>
            Add to Discord
            <span aria-hidden className="font-mono group-hover/button:translate-x-0.5">
              →
            </span>
          </Button>
          <Button size="lg" render={<Link to="/panel" />}>
            Open panel
          </Button>
        </div>

        <div className="motion-safe:animate-hero-rise mt-14 w-full max-w-md [animation-delay:800ms]">
          <div
            aria-hidden
            className="border border-border bg-background/70 px-4 py-3 text-left font-mono text-sm backdrop-blur-sm"
          >
            <span className="text-brand-500">/</span>
            <span className="text-foreground">addemote</span>{" "}
            <span className="text-muted">emote:</span>
            <span className="text-foreground">{typed}</span>
            <span
              className={`ml-px inline-block h-4 w-2 translate-y-0.5 bg-brand-500 ${done ? "motion-safe:animate-hero-blink" : ""}`}
            />
            <span
              className={`float-right text-muted text-xs leading-5 transition-opacity duration-300 ${done ? "opacity-100" : "opacity-0"}`}
            >
              <span className="text-brand-400">✓</span> added
            </span>
          </div>
          <p className="mt-3 font-mono text-muted/70 text-xs tracking-widest">
            7TV · BTTV · FFZ · LINKS · MESSAGES
          </p>
        </div>
      </div>
    </section>
  );
}
