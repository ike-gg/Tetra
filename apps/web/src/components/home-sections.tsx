import { useRef, useState } from "react";

import { Footer } from "@/components/footer";
import { Stats } from "@/components/stats";
import { TetraField } from "@/components/tetra-field";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { INVITE_URL } from "@/lib/links";

const FEATURES = [
  {
    title: "Every source",
    body: "7TV, BTTV and FFZ links, emote names, direct image links or an emote from another message.",
    art: ["  .--.  ", " ( @@ ) ", "  `--'  "],
  },
  {
    title: "Fits in 256 KB",
    body: "Big animated emotes get resized and recompressed automatically until Discord accepts them.",
    art: ["[######]", "[####  ]", "[##    ]"],
  },
  {
    title: "Media from posts",
    body: "/media pulls videos and images out of social media posts straight into the chat.",
    art: [" +----+ ", " | >  | ", " +----+ "],
  },
  {
    title: "Web panel",
    body: "Browse server emotes, restore deleted ones and edit them in the browser.",
    art: [" _____  ", "|=|   | ", "|_|___| "],
  },
];

const STEPS = [
  { command: "invite", text: "Add Tetra to your server with the invite link." },
  {
    command: "/addemote",
    text: "Paste a link or a name. Tetra finds, optimizes and uploads it.",
  },
  { command: ":catJAM:", text: "Use it right away. Manage the rest from the panel." },
];

export function HomeSections() {
  return (
    <div className="relative bg-linear-to-b from-transparent via-background/85 via-30% to-background">
      <section className="mx-auto max-w-6xl px-6 pt-40 pb-28">
        <Eyebrow index="01">features</Eyebrow>
        <Heading level={2} className="mt-4 max-w-2xl">
          Built for chats that speak in <Accent>emotes</Accent>.
        </Heading>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col gap-6 bg-background p-8"
            >
              <pre aria-hidden className="font-mono text-muted text-sm leading-tight">
                {feature.art.join("\n")}
              </pre>
              <div>
                <Heading level={3} size="sm">
                  {feature.title}
                </Heading>
                <Text tone="muted" className="mt-2">
                  {feature.body}
                </Text>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <Eyebrow index="02">how it works</Eyebrow>
        <Heading level={2} className="mt-4 max-w-2xl">
          Three steps, <Accent>zero</Accent> resizing.
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
      <div className="relative overflow-hidden border border-border bg-surface px-8 py-20 text-center">
        <TetraField revealAll={reveal} originRef={buttonRef} />
        <div className="relative">
          <Heading level={2} className="mx-auto max-w-xl">
            Give your server <Accent>better</Accent> emotes.
          </Heading>
          <Text tone="muted" className="mx-auto mt-4 max-w-md">
            Ready the moment it joins your server.
          </Text>
          <div ref={buttonRef} className="mt-10 inline-flex">
            <Button
              variant="primary"
              size="lg"
              render={<a href={INVITE_URL} />}
              onPointerEnter={() => setReveal(true)}
              onPointerLeave={() => setReveal(false)}
              onFocus={() => setReveal(true)}
              onBlur={() => setReveal(false)}
            >
              Add to Discord <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
