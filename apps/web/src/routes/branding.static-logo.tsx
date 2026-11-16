import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { ChapterCrumb } from "@/components/brand-book";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  CONCEPTS,
  type Concept,
  PixelZoom,
  StaticMark,
  type Surface,
  type Variant,
} from "@/components/static-logo-concepts";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/branding/static-logo")({
  head: () => seoHead("static-logo"),
  component: StaticLogoPage,
});

const SIZES = [16, 24, 32, 48, 96];

// Fixed first seed, so the prerendered page and the hydrated one draw the same wall
const FIRST_SEED = 38;

const SURFACES: Record<Surface, { cell: string; label: string; caption: string }> = {
  dark: { cell: "bg-background", label: "on dark", caption: "text-muted" },
  light: { cell: "bg-neutral-100", label: "on light", caption: "text-neutral-600" },
};

const ALL_VARIANTS = CONCEPTS.flatMap((concept) =>
  concept.variants.map((variant) => ({ letter: concept.letter, variant }))
);

const sectionIndex = (n: number) => String(n).padStart(2, "0");

function StaticLogoPage() {
  const [seed, setSeed] = useState(FIRST_SEED);
  const reroll = () => setSeed(Math.floor(Math.random() * 2 ** 31));

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 pt-28 pb-24 sm:px-6">
        <section className="flex flex-col gap-6">
          <ChapterCrumb chapter="static-logo" />
          <Eyebrow index="01">static mark</Eyebrow>
          <Heading level={1}>A wall of ASCII, with a dense square.</Heading>
          <Text tone="muted" className="max-w-xl">
            The favicon, the server icon and the bot's avatar show one frozen frame,
            mostly at 16 to 48 px. The frame is the brand's own backdrop: random ASCII on
            black, barely visible, 28 characters per side, and a centered square from the
            dense end of the ASCII art ramp, bright and bold. Classic characters only, at
            their natural size. Four widths of square; below 28 px each one turns into
            pixels with the same share of white, so it stays a square in a tab.
          </Text>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" onClick={reroll}>
              Reroll characters
            </Button>
            <span className="font-mono text-muted text-xs tabular-nums">seed {seed}</span>
          </div>
        </section>

        {CONCEPTS.map((concept, index) => (
          <ConceptSection
            key={concept.letter}
            concept={concept}
            seed={seed}
            index={sectionIndex(index + 2)}
          />
        ))}

        <section className="flex flex-col gap-6">
          <Eyebrow index={sectionIndex(CONCEPTS.length + 2)}>in context</Eyebrow>
          <Heading level={2}>Side by side, at the sizes that matter.</Heading>
          <Text tone="muted" className="max-w-xl">
            A tab strip at 16 px. Below, Discord's crop for the bot avatar and the server
            icon: the image stays square, Discord masks it to a circle, and only the wall
            gets cut.
          </Text>
          <TabStrip surface="dark" seed={seed} />
          <TabStrip surface="light" seed={seed} />
          <Avatars seed={seed} />
        </section>
      </div>
      <Footer />
    </div>
  );
}

function ConceptSection({
  concept,
  seed,
  index,
}: {
  concept: Concept;
  seed: number;
  index: string;
}) {
  return (
    <section className="flex flex-col gap-6">
      <Eyebrow index={index}>concept {concept.letter.toLowerCase()}</Eyebrow>
      <Heading level={2}>
        {concept.letter}. {concept.name}
      </Heading>
      <Text tone="muted" className="max-w-xl">
        {concept.summary}
      </Text>

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {concept.variants.map((variant) => (
          <div
            key={variant.id}
            className="flex flex-col items-center gap-6 bg-surface px-4 pt-10 pb-4"
          >
            <StaticMark
              variant={variant}
              size={240}
              seed={seed}
              className="block size-36 shrink-0 sm:size-48"
            />
            <span className="text-center font-mono text-muted text-xs">
              {variant.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {concept.variants.flatMap((variant) =>
          (["dark", "light"] as const).map((surface) => (
            <SizeRow
              key={`${variant.id}-${surface}`}
              variant={variant}
              surface={surface}
              seed={seed}
            />
          ))
        )}
      </div>

      <div className="grid gap-px bg-border font-mono text-xs sm:grid-cols-2">
        <ul className="flex flex-col gap-2 bg-background p-4">
          {concept.pros.map((line) => (
            <li key={line} className="flex gap-2 text-foreground">
              <span aria-hidden className="text-primary">
                +
              </span>
              <span className="sr-only">Pro: </span>
              {line}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2 bg-background p-4">
          {concept.cons.map((line) => (
            <li key={line} className="flex gap-2 text-muted">
              <span aria-hidden>-</span>
              <span className="sr-only">Con: </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SizeRow({
  variant,
  surface,
  seed,
}: {
  variant: Variant;
  surface: Surface;
  seed: number;
}) {
  const { cell, caption, label } = SURFACES[surface];
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">
        {variant.label} · {label}
      </p>
      <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
        {SIZES.map((size) => (
          <SizeCell key={size} className={cell} caption={caption} label={`${size} px`}>
            <StaticMark variant={variant} size={size} seed={seed} />
          </SizeCell>
        ))}
        <SizeCell className={cell} caption={caption} label="16 @1x, 6×">
          <PixelZoom variant={variant} seed={seed} />
        </SizeCell>
      </div>
    </div>
  );
}

function SizeCell({
  label,
  className,
  caption,
  children,
}: {
  label: string;
  className: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center justify-end gap-3 px-2 pt-6 pb-3",
        className
      )}
    >
      {children}
      <span className={cn("font-mono text-xs", caption)}>{label}</span>
    </div>
  );
}

const TAB_CHROME: Record<Surface, { strip: string; tab: string; active: string }> = {
  dark: {
    strip: "bg-neutral-950 border-border",
    tab: "bg-neutral-900 text-neutral-400 border-neutral-800",
    active: "bg-neutral-800 text-neutral-100",
  },
  light: {
    strip: "bg-neutral-300 border-neutral-400",
    tab: "bg-neutral-200 text-neutral-600 border-neutral-300",
    active: "bg-neutral-50 text-neutral-950",
  },
};

function TabStrip({ surface, seed }: { surface: Surface; seed: number }) {
  const chrome = TAB_CHROME[surface];
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">
        tab strip · {SURFACES[surface].label}
      </p>
      <div
        aria-hidden
        className={cn("grid grid-cols-2 gap-px border p-px lg:grid-cols-4", chrome.strip)}
      >
        {ALL_VARIANTS.map(({ variant }, index) => (
          <div
            key={variant.id}
            className={cn(
              "flex h-9 min-w-0 items-center gap-2 px-2.5 text-xs",
              index === 0 ? chrome.active : chrome.tab
            )}
          >
            <StaticMark variant={variant} size={16} seed={seed} />
            <span className="truncate">{variant.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_SIZES = [80, 40, 32];

function Avatars({ seed }: { seed: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">
        avatar · circle crop at 80 / 40 / 32 px, the full square ghosted behind
      </p>
      <div className="grid gap-px bg-border sm:grid-cols-2 md:grid-cols-4">
        {ALL_VARIANTS.map(({ variant }) => (
          <div key={variant.id} className="flex flex-col gap-4 bg-surface p-3">
            <div className="flex items-end gap-2">
              {AVATAR_SIZES.map((size) => (
                <Avatar
                  key={size}
                  variant={variant}
                  size={size}
                  seed={seed}
                  ghost={size === 80}
                />
              ))}
            </div>
            <span className="truncate font-mono text-muted text-xs">{variant.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({
  variant,
  size,
  seed,
  ghost,
}: {
  variant: Variant;
  size: number;
  seed: number;
  ghost: boolean;
}) {
  const face = <StaticMark variant={variant} size={size} seed={seed} />;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {ghost && <div className="absolute inset-0 opacity-20">{face}</div>}
      {/* Discord's crop, previewed as a mask: the mark itself stays square */}
      <div className="absolute inset-0 [clip-path:circle(50%)]">{face}</div>
    </div>
  );
}
