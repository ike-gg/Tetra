import { Link } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { Stats } from "@/components/stats";
import { TetraField } from "@/components/tetra-field";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { formatBytes } from "@/lib/format-bytes";
import { INVITE_URL } from "@/lib/links";

const KB = 1024;
const MB = KB * 1024;
const DISCORD_LIMIT = 256 * KB;

// Illustrative sizes, labelled "example sizes" on the page: a full-size animated 7TV
// emote against what a 128 px re-encode typically lands at. Not measured runs.
const OPTIMIZED = [
  { name: "catJAM", before: 1.4 * MB, after: 248 * KB },
  { name: "pepeD", before: 3.1 * MB, after: 231 * KB },
  { name: "ratJAM", before: 2.2 * MB, after: 254 * KB },
  { name: "NODDERS", before: 860 * KB, after: 196 * KB },
];
const SCALE_MAX = Math.max(...OPTIMIZED.map((emote) => emote.before));
const percent = (bytes: number) => `${(bytes / SCALE_MAX) * 100}%`;

type Feature = {
  key: string;
  title: ReactNode;
  body: ReactNode;
  link?: { label: string; to: "/editor" };
  isNew?: boolean;
};

const FEATURES: Feature[] = [
  {
    key: "sources",
    title: "7TV, BTTV and FFZ",
    body: "paste a link or just type the emote's name",
  },
  {
    key: "links",
    title: "image links",
    body: "any direct link to a GIF or an image works too",
  },
  {
    key: "messages",
    title: "from a message",
    body: "take an emote someone used in another message",
  },
  {
    key: "media",
    title: <code className="font-mono">/media</code>,
    body: "downloads videos and images from social posts straight into the chat",
  },
  {
    key: "panel",
    title: "web panel",
    body: "browse your server's emotes, restore removed ones and edit them in the browser",
  },
  {
    key: "editor",
    title: "editor",
    body: "crop, trim, resize and compress GIFs and images in the browser. no account, and the file never leaves your device",
    link: { label: "resize a GIF for discord", to: "/editor" },
    isNew: true,
  },
];

export function HomeSections() {
  return (
    <div className="relative bg-linear-to-b from-transparent via-background/85 via-30% to-background">
      <Optimization />
      <FeatureList />
      <Stats />
      <CallToAction />
      <Footer />
    </div>
  );
}

function Optimization() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-40 pb-28">
      <Heading level={2} className="max-w-2xl">
        big emotes, shrunk until Discord takes them
      </Heading>
      <Text tone="muted" className="mt-4 max-w-xl">
        Discord rejects emotes over 256 KB, and most animated ones from 7TV are far
        bigger. tetra resizes and recompresses them until they fit
      </Text>

      <div className="mt-14 border-border border-t">
        <div className="flex items-baseline justify-between gap-4 py-3 font-mono text-muted text-xs tracking-widest">
          <span>before → after</span>
          <span>example sizes</span>
        </div>
        <ul className="m-0 list-none p-0">
          {OPTIMIZED.map((emote) => (
            <li
              key={emote.name}
              className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border-border border-t py-4 sm:grid-cols-[9rem_1fr_13rem]"
            >
              <span className="font-mono text-foreground text-sm">{emote.name}</span>
              <span className="order-last col-span-2 flex flex-col gap-1 sm:order-none sm:col-span-1">
                <span className="relative block h-2">
                  <span
                    className="absolute inset-y-0 left-0 bg-primary"
                    style={{ width: percent(emote.before) }}
                  />
                  <LimitMark />
                </span>
                <span className="relative block h-2">
                  <span
                    className="absolute inset-y-0 left-0 bg-foreground"
                    style={{ width: percent(emote.after) }}
                  />
                  <LimitMark />
                </span>
              </span>
              <span className="text-right font-mono text-sm tabular-nums">
                <span className="text-primary">{formatBytes(emote.before)}</span>
                <span className="text-muted"> → </span>
                <span className="text-foreground">{formatBytes(emote.after)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 border-border border-t py-3 font-mono text-muted text-xs tracking-widest">
          <span aria-hidden className="h-3 w-px bg-muted" />
          Discord&apos;s limit, 256 KB
        </p>
      </div>
    </section>
  );
}

function LimitMark() {
  return (
    <span
      aria-hidden
      className="absolute -inset-y-1 w-px bg-muted"
      style={{ left: percent(DISCORD_LIMIT) }}
    />
  );
}

function FeatureList() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-28 lg:grid-cols-[1fr_2fr] lg:gap-16">
      <Heading level={2} size="lg" className="max-w-xs">
        everything else tetra does
      </Heading>

      <dl className="m-0 border-border border-t">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="grid gap-1 border-border border-b py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <dt className="flex items-center gap-3 font-medium text-foreground">
              {feature.title}
              {feature.isNew && (
                <span className="font-mono text-signal text-xs tracking-widest">
                  [new]
                </span>
              )}
            </dt>
            <dd className="m-0 text-muted">
              {feature.body}
              {feature.link && (
                <Button
                  size="sm"
                  className="mt-3 flex w-fit"
                  render={<Link to={feature.link.to} />}
                >
                  {feature.link.label}
                </Button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CallToAction() {
  const buttonRef = useRef<HTMLDivElement>(null);
  // Hover or keyboard focus on the button fills the whole background with "tetra"
  const [reveal, setReveal] = useState(false);

  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <div className="relative overflow-hidden px-8 py-32 text-center">
        <TetraField revealAll={reveal} originRef={buttonRef} />
        <div className="relative">
          <Heading level={2} className="mx-auto max-w-xl">
            give your server <Accent>better</Accent> emotes
          </Heading>
          <Text tone="muted" className="mx-auto mt-4 max-w-md">
            invite tetra, run <code className="font-mono text-foreground">/addemote</code>{" "}
            with a name or a link, and the emote is ready to use
          </Text>
          <div ref={buttonRef} className="mt-10 inline-flex">
            <Button
              variant="primary"
              size="lg"
              render={<a href={INVITE_URL} data-track-location="home-cta" />}
              onPointerEnter={() => setReveal(true)}
              onPointerLeave={() => setReveal(false)}
              // Keyboard focus only: a clicked link keeps focus, and returning to the tab
              // re-fires focus on it, which left the reveal stuck on
              onFocus={(event) =>
                setReveal(event.currentTarget.matches(":focus-visible"))
              }
              onBlur={() => setReveal(false)}
            >
              add to discord
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
