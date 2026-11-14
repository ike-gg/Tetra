import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  autoBuild,
  type Build,
  CONCEPTS,
  type Concept,
  PixelZoom,
  StaticMark,
  type Surface,
  type Variant,
} from "@/components/static-logo-concepts";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { NOINDEX_META } from "@/lib/seo";

export const Route = createFileRoute("/static-logo")({
  head: () => ({
    meta: [{ title: "Static logo · Tetra" }, NOINDEX_META],
  }),
  component: StaticLogoPage,
});

const SIZES = [16, 24, 32, 48, 96];

const SURFACES: Record<Surface, { cell: string; label: string; caption: string }> = {
  dark: { cell: "bg-background", label: "on dark", caption: "text-muted" },
  light: { cell: "bg-neutral-100", label: "on light", caption: "text-neutral-600" },
};

const ALL_VARIANTS = CONCEPTS.flatMap((concept) =>
  concept.variants.map((variant) => ({ concept, variant }))
);

function StaticLogoPage() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 pt-28 pb-24 sm:px-6">
        <section className="flex flex-col gap-6">
          <Eyebrow index="01">static mark</Eyebrow>
          <Heading level={1}>When the block can't fall, it still has to read.</Heading>
          <Text tone="muted" className="max-w-xl">
            Favicons, app icons, the bot's avatar and link previews show one frozen frame.
            The animated logo rests as a plain white square, which says little on its own.
            Six proposals, each drawn on a 16-unit grid so it lands on whole pixels at
            favicon size.
          </Text>
          <Text tone="muted" size="sm" className="max-w-xl">
            Proposals only: the favicon and the animated logo stay as they are.
          </Text>
        </section>

        {CONCEPTS.map((concept, index) => (
          <ConceptSection
            key={concept.letter}
            concept={concept}
            index={String(index + 2).padStart(2, "0")}
          />
        ))}

        <section className="flex flex-col gap-6">
          <Eyebrow index="08">in context</Eyebrow>
          <Heading level={2}>Side by side, at the sizes that matter.</Heading>
          <Text tone="muted" className="max-w-xl">
            A tab strip at 16 px, each concept's small build where it has one. Below,
            Discord's avatar crop: the image stays square, Discord masks it to a circle.
          </Text>
          <TabStrip surface="dark" />
          <TabStrip surface="light" />
          <Avatars />
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="09">recommendation</Eyebrow>
          <Heading level={2}>
            Carved T for the favicon, the orange tetromino for the bot.
          </Heading>
          <dl className="grid gap-px bg-border sm:grid-cols-3">
            <Pick
              label="favicon"
              title="C · carved T"
              body="Same square the animated logo lands on, now with a letter. Whole-unit geometry keeps it crisp at 16 px, and the hole works on any tab color."
            />
            <Pick
              label="bot avatar"
              title="B · orange stem"
              body="A T fits the circle crop better than a square does, and the orange cell picks the bot out of a member list at 32 px."
            />
            <Pick
              label="og images, large"
              title="A · ASCII T"
              body="The glyphs need room. At 256 px and up the ramp texture is the most ours of the six; below that it falls back to C."
            />
          </dl>
        </section>
      </div>
      <Footer />
    </div>
  );
}

function ConceptSection({ concept, index }: { concept: Concept; index: string }) {
  return (
    <section className="flex flex-col gap-6">
      <Eyebrow index={index}>concept {concept.letter.toLowerCase()}</Eyebrow>
      <Heading level={2}>
        {concept.letter}. {concept.name}
      </Heading>
      <Text tone="muted" className="max-w-xl">
        {concept.summary}
      </Text>

      <div
        className={cn(
          "grid grid-cols-2 gap-px bg-border",
          concept.variants.length > 1 && "lg:grid-cols-4"
        )}
      >
        {concept.variants.flatMap((variant) =>
          (["dark", "light"] as const).map((surface) => (
            <div
              key={`${variant.id}-${surface}`}
              className={cn(
                "flex flex-col items-center gap-6 px-4 pt-10 pb-4",
                SURFACES[surface].cell
              )}
            >
              <StaticMark
                variant={variant}
                size={160}
                surface={surface}
                className="block size-28 shrink-0 sm:size-40"
              />
              <span className={cn("font-mono text-xs", SURFACES[surface].caption)}>
                {variant.label}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-4">
        {concept.variants.flatMap((variant) => {
          const builds: Build[] = variant.small ? ["full", "small"] : ["full"];
          return builds.flatMap((build) =>
            (["dark", "light"] as const).map((surface) => (
              <SizeRow
                key={`${variant.id}-${build}-${surface}`}
                variant={variant}
                build={build}
                surface={surface}
                showBuild={Boolean(variant.small)}
              />
            ))
          );
        })}
      </div>

      {concept.smallNote && (
        <Text tone="muted" size="sm" className="max-w-xl">
          {concept.smallNote}
        </Text>
      )}

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
  build,
  surface,
  showBuild,
}: {
  variant: Variant;
  build: Build;
  surface: Surface;
  showBuild: boolean;
}) {
  const { cell, caption } = SURFACES[surface];
  const label = [
    variant.label,
    showBuild && (build === "small" ? "small build" : "as drawn"),
    SURFACES[surface].label,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">{label}</p>
      <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
        {SIZES.map((size) => (
          <SizeCell key={size} className={cell} caption={caption} label={`${size} px`}>
            <StaticMark variant={variant} size={size} surface={surface} build={build} />
          </SizeCell>
        ))}
        <SizeCell className={cell} caption={caption} label="16 @1x, 6×">
          <PixelZoom variant={variant} surface={surface} build={build} />
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

function TabStrip({ surface }: { surface: Surface }) {
  const chrome = TAB_CHROME[surface];
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">
        tab strip · {SURFACES[surface].label}
      </p>
      <div
        aria-hidden
        className={cn(
          "grid grid-cols-2 gap-px border p-px sm:grid-cols-5 lg:grid-cols-10",
          chrome.strip
        )}
      >
        {ALL_VARIANTS.map(({ concept, variant }, index) => (
          <div
            key={variant.id}
            className={cn(
              "flex h-9 min-w-0 items-center gap-2 px-2.5 text-xs",
              index === 0 ? chrome.active : chrome.tab
            )}
          >
            <StaticMark
              variant={variant}
              size={16}
              surface={surface}
              build={autoBuild(variant, 16)}
            />
            <span className="truncate">{concept.letter} · Tetra</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_SIZES = [80, 40, 32];
// The mark takes 10 of the avatar's 16 units, which keeps its corners inside the circle
const AVATAR_MARK = 10 / 16;

function Avatars() {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-muted text-xs">
        bot avatar · circle crop at 80 / 40 / 32 px, the full square ghosted behind
      </p>
      <div className="grid gap-px bg-border sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {ALL_VARIANTS.map(({ concept, variant }) => (
          <div key={variant.id} className="flex flex-col gap-4 bg-surface p-3">
            <div className="flex items-end gap-2">
              {AVATAR_SIZES.map((size) => (
                <Avatar key={size} variant={variant} size={size} ghost={size === 80} />
              ))}
            </div>
            <span className="truncate font-mono text-muted text-xs">
              {concept.letter} · {variant.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({
  variant,
  size,
  ghost,
}: {
  variant: Variant;
  size: number;
  ghost: boolean;
}) {
  const markSize = Math.round(size * AVATAR_MARK);
  const face = (
    <div className="flex size-full items-center justify-center bg-background">
      <StaticMark
        variant={variant}
        size={markSize}
        surface="dark"
        build={autoBuild(variant, markSize)}
      />
    </div>
  );
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {ghost && <div className="absolute inset-0 opacity-20">{face}</div>}
      {/* Discord's crop, previewed as a mask: the mark itself stays square */}
      <div className="absolute inset-0 [clip-path:circle(50%)]">{face}</div>
    </div>
  );
}

function Pick({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 bg-background p-5">
      <dt className="font-mono text-muted text-xs">{label}</dt>
      <dd className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted text-sm">{body}</span>
      </dd>
    </div>
  );
}
