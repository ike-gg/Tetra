import { Link } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { Stats } from "@/components/stats";
import { TetraField } from "@/components/tetra-field";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipTerm } from "@/components/ui/tooltip";
import { formatBytes } from "@/lib/format-bytes";
import { INVITE_URL } from "@/lib/links";

const DISCORD_LIMIT = 256 * 1024;

// Measured 2026-11-17: core's optimizeBuffer (default contain fitting) on the 3x.gif the
// bot downloads from 7TV. The outputs are in public/home/; the original is shown from
// 7TV's lighter 2x.webp, the sizes are of the 3x.gif.
const OPTIMIZED = [
  {
    name: "AINTNOWAY",
    id: "01GDDQVMH000038Q48APH8VE3Q",
    file: "aintnoway",
    before: 1454083,
    after: 250943,
  },
  {
    name: "WhoAsked",
    id: "01FNSSG3T8000EJT2EVEY3FBSY",
    file: "whoasked",
    before: 2102067,
    after: 253775,
  },
  {
    name: "OOOO",
    id: "01GB4PT9NG000DGEZ8VYY59RSM",
    file: "oooo",
    before: 1350403,
    after: 211469,
  },
  {
    name: "Vibe",
    id: "01FRTYR8RR0005FHRFCCZBSEKR",
    file: "vibe",
    before: 1166850,
    after: 241746,
  },
];
const SCALE_MAX = Math.max(...OPTIMIZED.map((emote) => emote.before));
const percent = (bytes: number) => `${(bytes / SCALE_MAX) * 100}%`;

type Product = {
  title: string;
  isNew?: boolean;
  summary: string;
  facts: { label: string; value: string }[];
  does: string[];
  button: ReactNode;
};

// Same facts in the same order on both cards, so they read as a comparison
const PRODUCTS: Product[] = [
  {
    title: "editor",
    isNew: true,
    summary: "a quick editor for any GIF or image, in the browser",
    facts: [
      { label: "for", value: "any file, emote or not" },
      { label: "account", value: "none" },
      { label: "your file", value: "stays on your device" },
      {
        label: "result",
        value: "download it, or add it to a server when you're logged in",
      },
    ],
    does: [
      "crop, trim, resize and compress",
      "shows the size against Discord's 256 KB as you change it",
    ],
    button: <Button render={<Link to="/editor" />}>open the editor</Button>,
  },
  {
    title: "panel",
    summary: "everything tetra does for your servers, on the web",
    facts: [
      { label: "for", value: "the servers you manage emotes on" },
      { label: "account", value: "log in with Discord" },
      { label: "your file", value: "edited in this browser, like in the editor" },
      { label: "result", value: "added straight to the server" },
    ],
    does: [
      "browse 7TV and FFZ and add from there",
      "a Twitch channel's emotes on Twitch, 7TV, BTTV and FFZ",
      "every server's emotes: add, remove, and restore ones removed while tetra was there",
      "keep a server in sync with a 7TV set, with your own rules (experimental)",
      "“open in editor” on tetra's reply in Discord brings the emote here to fix",
      "paste a link anywhere in the panel to add it",
      "the editor, built in",
    ],
    button: <Button render={<Link to="/panel" />}>open panel</Button>,
  },
];

const FEATURES: { key: string; title: ReactNode; body: string }[] = [
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
];

export function HomeSections() {
  return (
    <div className="relative bg-linear-to-b from-transparent via-background/85 via-30% to-background">
      <Optimization />
      <TuneIt />
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
      <Tooltip>
        <Heading level={2} className="max-w-2xl">
          <TooltipTerm className="italic">nearly</TooltipTerm> the same emote, a fraction
          of the size
        </Heading>
        <TooltipContent>
          Discord&apos;s 256 KB limit is tight, so some detail goes. at chat size
          it&apos;s hard to spot
        </TooltipContent>
      </Tooltip>
      <Text tone="muted" className="mt-4 max-w-xl">
        Discord rejects emotes over 256 KB, and about one in three of 7TV&apos;s most
        popular animated emotes is bigger than that. tetra fits them automatically, with
        no hand tuning. side by side you can spot a difference, because Discord&apos;s
        limit is that strict
      </Text>

      <div className="mt-14 border-border border-t">
        <div className="flex items-baseline justify-between gap-4 py-3 font-mono text-muted text-xs tracking-widest">
          <span>7TV&apos;s file → tetra&apos;s</span>
          <span>automatic, measured on 7TV&apos;s GIFs</span>
        </div>
        <ul className="m-0 list-none p-0">
          {OPTIMIZED.map((emote) => (
            <li
              key={emote.id}
              className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 border-border border-t py-4 sm:grid-cols-[auto_7rem_1fr_12rem]"
            >
              <span className="flex items-center gap-2">
                <EmoteImage
                  src={`https://cdn.7tv.app/emote/${emote.id}/2x.webp`}
                  alt={`${emote.name} from 7TV`}
                />
                <span aria-hidden className="font-mono text-muted text-sm">
                  →
                </span>
                <EmoteImage
                  src={`/home/${emote.file}.gif`}
                  alt={`${emote.name} from tetra`}
                />
              </span>
              <span className="font-mono text-foreground text-sm">{emote.name}</span>
              <span className="col-span-2 flex flex-col gap-1 sm:col-span-1">
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
              <span className="col-span-2 font-mono text-sm tabular-nums sm:col-span-1 sm:text-right">
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

function EmoteImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="block size-12 shrink-0 bg-checker">
      <img
        src={src}
        alt={alt}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="size-12 object-contain"
      />
    </span>
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

function TuneIt() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <Heading level={2} className="max-w-2xl">
        too big to shrink well? tune it yourself
      </Heading>
      <Text tone="muted" className="mt-4 max-w-xl">
        when an emote is far over the limit, fitting it automatically costs quality. in
        the editor you pick the crop, the length and the size yourself, and the result
        usually looks better
      </Text>

      <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
        {PRODUCTS.map((product) => (
          <article key={product.title} className="flex flex-col bg-background p-8">
            <Heading level={3} size="lg" className="flex items-center gap-3">
              {product.title}
              {product.isNew && (
                <span className="font-mono font-normal text-signal text-xs tracking-widest">
                  [new]
                </span>
              )}
            </Heading>
            <Text tone="muted" className="mt-2">
              {product.summary}
            </Text>

            <dl className="m-0 mt-8 border-border border-t">
              {product.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="grid grid-cols-[6rem_1fr] gap-4 border-border border-b py-3 text-sm"
                >
                  <dt className="font-mono text-muted text-xs leading-5 tracking-widest">
                    {fact.label}
                  </dt>
                  <dd className="m-0 text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <ul className="m-0 mt-6 flex list-none flex-col gap-2 p-0 text-muted text-sm">
              {product.does.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="font-mono text-border">
                    -
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">{product.button}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureList() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-28 lg:grid-cols-[1fr_2fr] lg:gap-16">
      <Heading level={2} size="lg" className="max-w-xs">
        what else tetra does
      </Heading>

      <dl className="m-0 border-border border-t">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="grid gap-1 border-border border-b py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <dt className="font-medium text-foreground">{feature.title}</dt>
            <dd className="m-0 text-muted">{feature.body}</dd>
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
