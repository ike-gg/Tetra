import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { EASE_OUT } from "@/components/logo";
import { Accent } from "@/components/ui/accent";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

const STATS = [
  { value: "3,500", label: "servers use tetra" },
  { value: "1.5M", label: "people on those servers" },
  { value: "150K", label: "emotes added" },
];

// Every digit is a reel that falls from 0 to its digit through one full turn, like an
// odometer, in the same falling language as the logo. Marketing-length on purpose: it
// plays once, when the section comes into view.
const ROLL_MS = 1400;
const DIGIT_STAGGER_MS = 60;
const STAT_STAGGER_MS = 150;

type Phase = "static" | "armed" | "rolling";

export function Stats() {
  const sectionRef = useRef<HTMLElement>(null);
  // Prerendered HTML and reduced motion show the plain numbers
  const [phase, setPhase] = useState<Phase>("static");

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Before the first paint after hydration: the section sits below the fold, so the
    // switch to zeros is never seen
    setPhase("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase("rolling");
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto max-w-6xl px-6 py-28">
      <Eyebrow index="03">in numbers</Eyebrow>
      <Heading level={2} className="mt-4 max-w-2xl">
        already in <Accent>thousands</Accent> of servers
      </Heading>

      <dl className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-3">
        {STATS.map((stat, index) => {
          return (
            <div key={stat.label} className="flex flex-col gap-3 bg-background p-8">
              <dt className="order-last font-mono text-muted text-xs tracking-widest">
                {stat.label}
              </dt>
              <dd className="font-semibold text-5xl tabular-nums leading-none tracking-tight sm:text-6xl">
                <span className="sr-only">{stat.value}+</span>
                <span aria-hidden>
                  {phase === "static" ? (
                    stat.value
                  ) : (
                    <RollingValue
                      value={stat.value}
                      rolling={phase === "rolling"}
                      delayMs={index * STAT_STAGGER_MS}
                    />
                  )}
                  <span className="text-muted">+</span>
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function RollingValue({
  value,
  rolling,
  delayMs,
}: {
  value: string;
  rolling: boolean;
  delayMs: number;
}) {
  let digitIndex = 0;
  return [...value].map((char, position) => {
    if (!/\d/.test(char)) {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed characters of a constant
        <span key={position}>{char}</span>
      );
    }
    const delay = delayMs + digitIndex++ * DIGIT_STAGGER_MS;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: fixed characters of a constant
      <DigitReel key={position} digit={Number(char)} rolling={rolling} delayMs={delay} />
    );
  });
}

function DigitReel({
  digit,
  rolling,
  delayMs,
}: {
  digit: number;
  rolling: boolean;
  delayMs: number;
}) {
  const stripRef = useRef<HTMLSpanElement>(null);
  // Top to bottom: the target first, then counting down through one full turn to 0, so
  // the falling strip shows 0, 1, 2… and stops on the digit
  const cells = Array.from({ length: 11 + digit }, (_, i) => (digit - i + 20) % 10);
  const start = `translateY(${(-(cells.length - 1) / cells.length) * 100}%)`;

  useEffect(() => {
    const strip = stripRef.current;
    if (!rolling || !strip) return;
    const animation = strip.animate(
      [{ transform: start }, { transform: "translateY(0)" }],
      {
        duration: ROLL_MS,
        delay: delayMs,
        easing: EASE_OUT,
        fill: "both",
      }
    );
    return () => animation.cancel();
  }, [rolling, delayMs, start]);

  // Cells are taller than the 1em window and centred in it, so the next digit stays out
  // of sight at rest and only shows while the reel moves
  return (
    <span className="relative inline-block h-[1em] overflow-hidden align-top">
      <span className="invisible">{digit}</span>
      <span
        ref={stripRef}
        className="absolute inset-x-0 top-[-0.25em] flex flex-col"
        style={{ transform: start }}
      >
        {cells.map((cell, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional reel cells
          <span key={i} className="flex h-[1.5em] items-center justify-center">
            {cell}
          </span>
        ))}
      </span>
    </span>
  );
}
