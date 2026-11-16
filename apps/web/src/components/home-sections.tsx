import { Link } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { Stats } from "@/components/stats";
import { TetraField } from "@/components/tetra-field";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { INVITE_URL } from "@/lib/links";

type Feature = {
  title: string;
  body: ReactNode;
  art: string[];
  // A wide card across both columns, with a link under the text
  wide?: { label: string; to: "/editor" };
};

const FEATURES: Feature[] = [
  {
    title: "every source",
    body: "7TV, BTTV and FFZ links, emote names, direct image links or an emote from another message",
    art: ["  .--.  ", " ( @@ ) ", "  `--'  "],
  },
  {
    title: "fits in 256 KB",
    body: "big animated emotes get resized and recompressed automatically until Discord accepts them",
    art: ["[######]", "[####  ]", "[##    ]"],
  },
  {
    title: "media from posts",
    body: (
      <>
        <code className="font-mono text-foreground">/media</code> downloads videos and
        images from social posts straight into the chat
      </>
    ),
    art: [" +----+ ", " | >  | ", " +----+ "],
  },
  {
    title: "web panel",
    body: "browse server emotes, restore removed ones and edit them in the browser",
    art: [" _____  ", "|=|   | ", "|_|___| "],
  },
  {
    title: "editor in your browser",
    body: "crop, trim, resize and compress GIFs and images until they fit Discord's 256 KB emote limit. no account, and the file never leaves your device",
    art: [" .-  -. ", "  [##]  ", " '-  -' "],
    wide: { label: "resize a GIF for discord", to: "/editor" },
  },
];

const STEPS = [
  { command: "invite", text: "add tetra to your server with the invite link" },
  {
    command: "/addemote",
    text: "paste a link or a name. tetra finds it, optimizes it and adds it",
  },
  { command: ":catJAM:", text: "use it right away. manage the rest from the panel" },
];

export function HomeSections() {
  return (
    <div className="relative bg-linear-to-b from-transparent via-background/85 via-30% to-background">
      <section className="mx-auto max-w-6xl px-6 pt-40 pb-28">
        <Eyebrow index="01">features</Eyebrow>
        <Heading level={2} className="mt-4 max-w-2xl">
          built for chats that speak in <Accent>emotes</Accent>
        </Heading>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className={cn(
                "flex flex-col gap-6 bg-background p-8",
                feature.wide && "sm:col-span-2"
              )}
            >
              <pre aria-hidden className="font-mono text-muted text-sm leading-tight">
                {feature.art.join("\n")}
              </pre>
              <div>
                <Heading level={3} size="sm">
                  {feature.title}
                </Heading>
                <Text tone="muted" className="mt-2 max-w-2xl">
                  {feature.body}
                </Text>
                {feature.wide && (
                  <Button
                    size="sm"
                    className="mt-6"
                    render={<Link to={feature.wide.to} />}
                  >
                    {feature.wide.label}
                    <span aria-hidden className="font-mono">
                      →
                    </span>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <Eyebrow index="02">how it works</Eyebrow>
        <Heading level={2} className="mt-4 max-w-2xl">
          three steps, <Accent>zero</Accent> resizing
        </Heading>

        <ol className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.command} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-brand-500">0{index + 1}</span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
              <code className="w-fit border border-border bg-surface px-2 py-1 font-mono text-foreground text-sm">
                {step.command}
              </code>
              <Text tone="muted">{step.text}</Text>
            </li>
          ))}
        </ol>
      </section>

      <Stats />

      <CallToAction />

      <Footer />
    </div>
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
            ready the moment it joins your server
          </Text>
          <div ref={buttonRef} className="mt-10 inline-flex">
            <Button
              variant="primary"
              size="lg"
              render={<a href={INVITE_URL} />}
              onPointerEnter={() => setReveal(true)}
              onPointerLeave={() => setReveal(false)}
              // Keyboard focus only: a clicked link keeps focus, and returning to the tab
              // re-fires focus on it, which left the reveal stuck on
              onFocus={(event) =>
                setReveal(event.currentTarget.matches(":focus-visible"))
              }
              onBlur={() => setReveal(false)}
            >
              add to discord <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
