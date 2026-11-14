import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { Footer } from "@/components/footer";
import { LOGO_EMOTES, LOGO_REEL_URL, Logo } from "@/components/logo";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Text } from "@/components/ui/text";

export const Route = createFileRoute("/logo")({
  head: () => ({
    meta: [{ title: "Logo · Tetra" }],
  }),
  component: LogoPage,
});

const SPEEDS = [
  ["1", "1×"],
  ["2", "0.5×"],
  ["4", "0.25×"],
] as const;

const SIZES = [
  ["size-4", "16"],
  ["size-6", "24"],
  ["size-8", "32"],
  ["size-12", "48"],
  ["size-24", "96"],
] as const;

function LogoPage() {
  // Bumping the key remounts every logo on the page, which replays the drop
  const [take, setTake] = useState(0);
  const [slowdown, setSlowdown] = useState("1");
  const replay = () => setTake((value) => value + 1);
  const logoProps = { slowdown: Number(slowdown) };

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pt-28 pb-24 sm:px-6">
        <section className="flex flex-col gap-6">
          <Eyebrow index="01">mark</Eyebrow>
          <Heading level={1}>A square. Emotes fall in, the block lands last.</Heading>
          <Text tone="muted" className="max-w-xl">
            The mark is a plain square in the foreground color. On first appearance a few
            of 7TV's most added emotes drop into it one by one, then the solid block lands
            on top and stays.
          </Text>
          <div className="flex flex-col items-center gap-8 border border-border bg-dots px-4 py-16">
            <Logo
              key={take}
              {...logoProps}
              className="size-40 text-foreground sm:size-64"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={replay}>Replay</Button>
              <SegmentedControl
                aria-label="Speed"
                value={slowdown}
                onValueChange={(next) => {
                  if (!next) return;
                  setSlowdown(next);
                  replay();
                }}
              >
                {SPEEDS.map(([value, label]) => (
                  <SegmentedControlItem key={value} value={value}>
                    {label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="02">sizes</Eyebrow>
          <div className="flex flex-wrap items-end gap-px bg-border">
            {SIZES.map(([size, label]) => (
              <Cell key={size} label={`${label} px`}>
                <Logo key={take} {...logoProps} className={`${size} text-foreground`} />
              </Cell>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="03">foreground</Eyebrow>
          <Text tone="muted" className="max-w-xl">
            The block takes the current text color: white on dark, black on light.
          </Text>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="flex h-48 items-center justify-center bg-background">
              <Logo key={take} {...logoProps} className="size-16 text-foreground" />
            </div>
            <div className="flex h-48 items-center justify-center bg-neutral-100">
              <Logo key={take} {...logoProps} className="size-16 text-neutral-950" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="04">navbar</Eyebrow>
          <Text tone="muted" className="max-w-xl">
            No bar, no border: a soft fade of the page color keeps it readable. The drop
            plays on every page load.
          </Text>
          <div className="relative h-32 overflow-hidden border border-border bg-dots">
            <Navbar className="absolute" />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="05">reel</Eyebrow>
          <Text tone="muted" className="max-w-xl">
            In falling order. Fetched from 7TV by{" "}
            <code className="font-mono">build:logo-reel</code>, each fitted to a 1:1
            square.
          </Text>
          <ol className="grid grid-cols-4 gap-px bg-border sm:grid-cols-8">
            {LOGO_EMOTES.map((name, index) => (
              <li key={name} className="flex flex-col gap-2 bg-background p-3">
                <span
                  aria-hidden
                  className="aspect-square w-full bg-no-repeat"
                  style={{
                    backgroundImage: `url(${LOGO_REEL_URL})`,
                    backgroundSize: `100% ${LOGO_EMOTES.length * 100}%`,
                    // The strip is stored bottom-up: the first to fall is the last cell
                    backgroundPosition: `0 ${((LOGO_EMOTES.length - 1 - index) / (LOGO_EMOTES.length - 1)) * 100}%`,
                  }}
                />
                <span className="truncate font-mono text-muted text-xs">{name}</span>
              </li>
            ))}
            <li className="flex flex-col gap-2 bg-background p-3">
              <span aria-hidden className="aspect-square w-full bg-foreground" />
              <span className="font-mono text-foreground text-xs">block</span>
            </li>
          </ol>
        </section>
      </div>
      <Footer />
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-24 flex-1 flex-col items-center justify-end gap-4 self-stretch bg-background p-6">
      {children}
      <span className="font-mono text-muted text-xs">{label}</span>
    </div>
  );
}
