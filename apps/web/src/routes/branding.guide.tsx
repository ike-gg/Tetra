import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { ChapterCrumb } from "@/components/brand-book";
import { Emote } from "@/components/emote/emote";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Navbar } from "@/components/navbar";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { Radio, RadioGroup } from "@/components/ui/radio";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SizeMeter } from "@/components/ui/size-meter";
import { Slider } from "@/components/ui/slider";
import { SlotMeter } from "@/components/ui/slot-meter";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Toaster, toast } from "@/components/ui/toaster";
import type { PanelEmote } from "@/lib/emote";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/branding/guide")({
  head: () => seoHead("guide"),
  component: BrandingPage,
});

const ASCII_RAMP = " .:-=+*#%@";

const PRINCIPLES = [
  ["square", "no rounded corners anywhere, not even on dots or avatars"],
  [
    "emotes are the color",
    "the interface stays dark and quiet, so the emotes carry the energy",
  ],
  ["one loud color", "orange marks what matters on a screen. everything else is neutral"],
  ["ASCII as an accent", "monospace glyphs nod to chat. seasoning, not the main course"],
  [
    "native, not a website",
    "controls behave like an installed app: instant states, default cursor",
  ],
];

const COLOR_ROLES = [
  {
    name: "background",
    swatch: "bg-background",
    value: "oklch(0.145 0.003 38)",
    use: "the page. surface for raised areas, border for lines",
  },
  {
    name: "primary",
    swatch: "bg-primary",
    value: "oklch(0.655 0.214 38) · #f64f02",
    use: "primary actions, the key word of a heading, focus rings, active states",
  },
  {
    name: "signal",
    swatch: "bg-signal",
    value: "oklch(0.81 0.13 215)",
    use: "at most one detail per view, never on the same element as orange",
  },
  {
    name: "danger",
    swatch: "bg-danger",
    value: "oklch(0.704 0.191 22.2)",
    use: "errors and invalid fields only. not a brand color",
  },
];

// Spelled out in full so Tailwind sees every class
const SCALES = [
  {
    name: "brand",
    steps: [
      ["50", "bg-brand-50"],
      ["100", "bg-brand-100"],
      ["200", "bg-brand-200"],
      ["300", "bg-brand-300"],
      ["400", "bg-brand-400"],
      ["500", "bg-brand-500"],
      ["600", "bg-brand-600"],
      ["700", "bg-brand-700"],
      ["800", "bg-brand-800"],
      ["900", "bg-brand-900"],
      ["950", "bg-brand-950"],
    ],
  },
  {
    name: "neutral",
    steps: [
      ["50", "bg-neutral-50"],
      ["100", "bg-neutral-100"],
      ["200", "bg-neutral-200"],
      ["300", "bg-neutral-300"],
      ["400", "bg-neutral-400"],
      ["500", "bg-neutral-500"],
      ["600", "bg-neutral-600"],
      ["700", "bg-neutral-700"],
      ["800", "bg-neutral-800"],
      ["900", "bg-neutral-900"],
      ["950", "bg-neutral-950"],
    ],
  },
  {
    name: "signal",
    steps: [
      ["300", "bg-signal-300"],
      ["400", "bg-signal-400"],
      ["500", "bg-signal-500"],
    ],
  },
];

const MOTION = [
  ["entrance", "rise and un-blur, 0.9 s, staggered by about 150 ms"],
  ["loading", "braille dots chasing around one cell, never a rotating circle"],
  [
    "signature",
    "the logo's emote drop, the orange wave behind the homepage, the odometer on numbers, a blinking block cursor",
  ],
  ["controls", "no transitions and no scaling. hover and press change color instantly"],
  ["reduced motion", "content appears at once and the background stops moving"],
] as const;

const NATIVE = [
  ["cursor", "buttons keep the arrow. not-allowed when disabled, wait when pending"],
  ["press", "every control has an active state one step darker than its hover"],
  ["selection", "chrome is select-none. emote names and copyable text stay selectable"],
  ["focus", "rings only from the keyboard (focus-visible), never on click"],
  ["layout", "screens start below a top margin, never centered vertically"],
] as const;

const BUTTON_VARIANTS = [
  ["primary", "add emote"],
  ["secondary", "open in editor"],
  ["destructive", "remove"],
  ["ghost", "cancel"],
] as const;
const BUTTON_SIZES = ["sm", "md", "lg"] as const;
const HEADING_SIZES = ["display", "xl", "lg", "md", "sm"] as const;

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-border border-t py-14 lg:grid-cols-[14rem_1fr] lg:gap-12">
      <header className="flex flex-col gap-2">
        <Heading level={2} size="lg">
          {title}
        </Heading>
        <Text size="sm" tone="muted">
          {note}
        </Text>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// Label/value rows, the page's one way of listing rules
function Rows({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="divide-y divide-border border-border border-y">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-6">
          <dt className="font-mono text-muted text-xs leading-5">{label}</dt>
          <dd className="text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BrandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <header className="flex max-w-2xl flex-col gap-6 pt-28 pb-16">
          <ChapterCrumb chapter="guide" />
          <Heading level={1} size="xl">
            how tetra <Accent>looks</Accent>
          </Heading>
          <Text size="lg" tone="muted">
            square, dark and quiet, so the emotes can be loud. these are the rules behind
            the site, the panel and the bot, with the tokens and components that follow
            them
          </Text>
        </header>

        <Section title="principles" note="five rules every screen follows">
          <ol className="divide-y divide-border border-border border-y">
            {PRINCIPLES.map(([title, body], index) => (
              <li
                key={title}
                className="grid gap-1 py-5 sm:grid-cols-[2rem_14rem_1fr] sm:gap-6"
              >
                <span className="font-mono text-muted text-sm leading-7">
                  {index + 1}
                </span>
                <span className="font-medium text-lg leading-7">{title}</span>
                <span className="text-muted leading-7">{body}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="color"
          note="three roles plus danger. dark only, there is no light theme. OKLCH tokens in app.css"
        >
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {COLOR_ROLES.map((role) => (
              <li key={role.name} className="flex gap-4 bg-background p-4">
                <span
                  className={`size-16 shrink-0 border border-border ${role.swatch}`}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <code className="font-mono text-sm">{role.name}</code>
                  <code className="break-words font-mono text-muted text-xs">
                    {role.value}
                  </code>
                  <span className="mt-1 text-muted text-sm">{role.use}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-6">
            {SCALES.map((scale) => (
              <div key={scale.name}>
                <p className="mb-2 font-mono text-muted text-xs">{scale.name}-*</p>
                <div className="flex border border-border">
                  {scale.steps.map(([value, swatch]) => (
                    <div key={value} className="flex min-w-0 flex-1 flex-col">
                      <div className={`h-12 ${swatch}`} />
                      <span className="border-border border-t py-1 text-center font-mono text-[10px] text-muted">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Rows
              rows={[
                ["text on color", "dark. white on #f64f02 fails contrast"],
                [
                  "contrast",
                  "body text at least 4.5:1, control edges and focus rings 3:1",
                ],
                [
                  "neutrals",
                  "Tailwind's steps with a faint tint of the brand hue, so grays feel warm",
                ],
                ["selection", "signal at 35%: it's the user's mark, not the page's"],
              ]}
            />
          </div>
        </Section>

        <Section
          title="type"
          note="the Geist family. sans for everything, serif as the accent, mono for ASCII"
        >
          <div className="flex flex-col gap-px border border-border bg-border">
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">font-sans · Geist · 100–900</p>
              <p className="font-semibold text-4xl tracking-tight">
                every emote, one command
              </p>
              <Text size="sm" tone="muted">
                interface, body text and most headings
              </Text>
            </div>
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                font-serif · Geist Serif · 400
              </p>
              <p className="font-semibold text-4xl tracking-tight">
                add any emote. <Accent>that&apos;s it</Accent>
              </p>
              <Text size="sm" tone="muted">
                one or two words of a heading, usually in orange. never body text or
                interface
              </Text>
            </div>
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                font-mono · Geist Mono · 100–900
              </p>
              <p className="font-mono text-2xl">/addemote catJAM</p>
              <Text size="sm" tone="muted">
                ASCII art, labels, commands, values with tabular numbers
              </Text>
            </div>
          </div>
        </Section>

        <Section title="shape" note="radius is always 0. lines instead of shadows">
          <Rows
            rows={[
              [
                "radius",
                <>
                  every <code className="font-mono">--radius-*</code> token is 0, so is
                  ui-sdk&apos;s <code className="font-mono">--ui-radius</code>. no{" "}
                  <code className="font-mono">rounded-full</code> either
                </>,
              ],
              [
                "structure",
                "1px hairlines. grids of cards share their borders (gap-px on a border-colored container)",
              ],
              [
                "shadows",
                "none, with two exceptions: the orange glow on a page's main call to action, and the navbar's fade into the page color",
              ],
            ]}
          />
        </Section>

        <Section title="logo" note="a plain square in the current text color">
          <div className="grid gap-px border border-border bg-border sm:grid-cols-[auto_1fr]">
            <div className="flex items-end gap-6 bg-background p-8">
              <Logo className="size-24" />
              <Logo className="size-10" animated={false} />
              <img src="/favicon.svg" alt="" width={16} height={16} className="size-4" />
            </div>
            <div className="bg-background p-6">
              <Rows
                rows={[
                  ["mark", "white on dark, black on light. no outline, no orange"],
                  [
                    "intro",
                    "seven emotes fall into the square, then the block lands. once per visit",
                  ],
                  [
                    "static",
                    "a square of dense ASCII on a dark wall, for icons and avatars. pixels below 28 px",
                  ],
                ]}
              />
              <p className="mt-4 text-muted text-sm">
                every size, the slow-motion drop and the emotes are on{" "}
                <Link
                  to="/branding/logo"
                  className="text-foreground underline underline-offset-4"
                >
                  the logo page
                </Link>
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="ASCII"
          note="the accent. one ASCII moment per block, always aria-hidden"
        >
          <div className="border border-border">
            <div className="grid grid-cols-10">
              {[...ASCII_RAMP].map((glyph, index) => (
                <span
                  key={glyph === " " ? "space" : glyph}
                  className="flex h-16 items-center justify-center border-border border-r font-mono text-2xl last:border-r-0"
                  style={{ opacity: 0.35 + (index / ASCII_RAMP.length) * 0.65 }}
                >
                  {glyph === " " ? "␣" : glyph}
                </span>
              ))}
            </div>
            <p className="border-border border-t px-3 py-2 font-mono text-muted text-xs">
              the ramp, light to dense. shared by the emote background, the logo and every
              fill
            </p>
          </div>
          <div className="mt-8">
            <Rows
              rows={[
                [
                  "use it for",
                  "small illustrations, section labels like [01] / features, command lines, a faint texture at about 10%",
                ],
                ["not for", "meaning. anything a screen reader needs is in plain text"],
                [
                  "interactive",
                  "one place only: the field behind the homepage's closing call to action",
                ],
              ]}
            />
          </div>
        </Section>

        <Section title="motion" note="quiet by default, a few signature moments">
          <div className="flex flex-col gap-6">
            <p className="flex items-center gap-3 text-sm">
              <Spinner /> optimizing catJAM
            </p>
            <Rows rows={MOTION} />
          </div>
        </Section>

        <Section
          title="native feel"
          note="the panel should feel like an installed app, not a web page"
        >
          <Rows rows={NATIVE} />
        </Section>

        <Section
          title="components"
          note="components/ui, built on ui-sdk where it ships the behavior. everything here is live"
        >
          <div className="flex flex-col gap-px border border-border bg-border">
            <div className="flex flex-col gap-6 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                &lt;Button variant size glow&gt;
              </p>
              {BUTTON_VARIANTS.map(([variant, label]) => (
                <div key={variant} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 font-mono text-muted text-xs">{variant}</span>
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={variant} size={size}>
                      {label}
                    </Button>
                  ))}
                  <Button variant={variant} disabled>
                    {label}
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 font-mono text-muted text-xs">glow</span>
                <Button variant="primary" size="lg" glow>
                  add to discord
                </Button>
                <span className="text-muted text-sm">
                  the main call to action, once per page
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                &lt;Heading level size&gt; · level is the outline, size is the look
              </p>
              {HEADING_SIZES.map((size) => (
                <div key={size} className="flex items-baseline gap-4">
                  <span className="w-24 shrink-0 font-mono text-muted text-xs">
                    {size}
                  </span>
                  <Heading level={3} size={size} className="min-w-0">
                    emotes, <Accent>squared</Accent>
                  </Heading>
                </div>
              ))}
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-2">
              <div className="flex flex-col gap-3 bg-background p-6">
                <p className="font-mono text-muted text-xs">&lt;Text size tone&gt;</p>
                <Text size="lg">large text for intros</Text>
                <Text>default body text</Text>
                <Text size="sm" tone="muted">
                  small muted text for secondary details
                </Text>
              </div>
              <div className="flex flex-col gap-3 bg-background p-6">
                <p className="font-mono text-muted text-xs">
                  &lt;Eyebrow index&gt; · &lt;Accent&gt;
                </p>
                <Eyebrow index="01">features</Eyebrow>
                <Eyebrow>emote manager for Discord</Eyebrow>
                <Text>
                  one <Accent>accent</Accent> per heading
                </Text>
              </div>
            </div>

            <ControlsSheet />
            <EmotesSheet />
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

const KB = 1024;

const sevenTvEmote = (id: string, name: string, animated = false): PanelEmote => ({
  key: `7tv:${id}`,
  id,
  name,
  previewUrl: `https://cdn.7tv.app/emote/${id}/2x.webp`,
  url: `https://cdn.7tv.app/emote/${id}/4x.webp`,
  animated,
  source: "7tv",
});

const DEMO_EMOTES = [
  sevenTvEmote("01FFMS6Q4G0009CAK0J14692AY", "HUH"),
  sevenTvEmote("01F6QWHR20000EB9BSAR8G1DKZ", "PauseChamp"),
  sevenTvEmote("01H876RPX8000918ZGPJMBHB7Z", "MONKA"),
  sevenTvEmote("01H96150H00003CY09NFH3G999", "gaga", true),
];

function EmotesSheet() {
  return (
    <div className="grid gap-px bg-border sm:grid-cols-2">
      <div className="flex flex-col gap-3 bg-background p-6">
        <p className="font-mono text-muted text-xs">
          &lt;EmoteMenu kind&gt; &lt;Emote emote&gt; · right-click or long-press
        </p>
        <div className="bg-checker">
          <EmoteMenu kind="task">
            <ul className="m-0 grid list-none grid-cols-4 gap-1 p-0">
              {DEMO_EMOTES.map((emote) => (
                <li key={emote.key} className="flex min-w-0">
                  <Emote emote={emote} className="w-full" />
                </li>
              ))}
            </ul>
          </EmoteMenu>
        </div>
        <Text size="sm" tone="muted">
          one component for every emote in the panel. the list&apos;s actions decide the
          menu, and a click selects it and brings up the selection bar
        </Text>
      </div>
      <div className="flex flex-col items-start gap-3 bg-background p-6">
        <p className="font-mono text-muted text-xs">
          &lt;Toaster&gt; · toast() · toast.promise()
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.success("added catJAM")}
          >
            success
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              toast.error("this server has no free emote slots", {
                description: "remove one or boost the server for more",
              })
            }
          >
            error
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
                loading: "restoring catJAM",
                success: "restored catJAM",
              })
            }
          >
            loading
          </Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function ControlsSheet() {
  const [view, setView] = useState("preview");
  const [size, setSize] = useState(96);
  const [name, setName] = useState("catJAM");
  const [trimEdges, setTrimEdges] = useState(true);
  const [server, setServer] = useState<string | null>("Chat Cafe");
  const [target, setTarget] = useState<string | null>(null);
  const nameError = /^[A-Za-z0-9_]{2,32}$/.test(name)
    ? undefined
    : "2–32 letters, numbers or _";

  return (
    <div className="grid gap-px bg-border sm:grid-cols-2">
      <div className="flex flex-col gap-3 bg-background p-6">
        <p className="font-mono text-muted text-xs">
          &lt;SegmentedControl&gt; · &lt;Slider&gt; · &lt;Switch&gt; · &lt;Radio&gt;
        </p>
        <SegmentedControl
          aria-label="view"
          value={view}
          onValueChange={(next) => next && setView(next)}
        >
          <SegmentedControlItem value="preview">preview</SegmentedControlItem>
          <SegmentedControlItem value="crop">crop</SegmentedControlItem>
        </SegmentedControl>
        <Slider
          label="size"
          value={size}
          onValueChange={setSize}
          min={32}
          max={128}
          step={8}
          format={(value) => `${value} px`}
          className="mt-3"
        />
        <Switch
          label="trim empty edges"
          description="cut transparent borders around the emote"
          checked={trimEdges}
          onCheckedChange={setTrimEdges}
          className="mt-3"
        />
        <RadioGroup
          aria-label="server"
          value={server}
          onValueChange={setServer}
          className="mt-3 flex flex-col gap-2"
        >
          {["Chat Cafe", "Emote Lab", "Full House"].map((option, index) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: Radio renders the control inside the label, as ui-sdk documents
            <label
              key={option}
              className="flex cursor-default select-none items-center gap-2.5 text-sm"
            >
              <Radio value={option} disabled={index === 2} />
              {option}
              {index === 2 && (
                <span className="font-mono text-muted text-xs">no free slots</span>
              )}
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="flex flex-col gap-3 bg-background p-6">
        <p className="font-mono text-muted text-xs">
          &lt;TextField prefix suffix error&gt; · &lt;Select&gt;
        </p>
        <TextField
          label="emote name"
          value={name}
          onValueChange={setName}
          prefix=":"
          suffix=":"
          error={nameError}
          description="clear it to see the inline error"
        />
        <Select<string>
          value={target}
          onValueChange={setTarget}
          placeholder="pick a server"
        >
          <div className="mt-3 flex flex-col gap-1.5">
            <SelectLabel className="font-medium text-foreground text-sm">
              add to
            </SelectLabel>
            <SelectTrigger>
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
          </div>
          <SelectContent>
            {[
              { name: "Chat Cafe", free: 12 },
              { name: "Emote Lab", free: 3 },
              { name: "Full House", free: 0 },
            ].map((option) => (
              <SelectItem
                key={option.name}
                value={option.name}
                label={option.name}
                disabled={option.free === 0}
              >
                <span className="min-w-0 truncate">{option.name}</span>
                <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs tabular-nums">
                  {option.free === 0 ? "animated full" : `${option.free} free`}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-6 bg-background p-6 sm:col-span-2">
        <p className="font-mono text-muted text-xs">
          &lt;SizeMeter value limit max&gt; · the bar ends at the original size
        </p>
        <div className="grid gap-8 sm:grid-cols-2">
          <SizeMeter value={338 * KB} limit={256 * KB} max={338 * KB} />
          <SizeMeter value={212 * KB} limit={256 * KB} max={338 * KB} />
        </div>
      </div>
      <div className="flex flex-col gap-6 bg-background p-6 sm:col-span-2">
        <p className="font-mono text-muted text-xs">
          &lt;SlotMeter label used limit&gt; · emote slots, orange in the last 10%
        </p>
        <div className="grid max-w-xl grid-cols-3 gap-6">
          <SlotMeter label="static" used={31} limit={50} />
          <SlotMeter label="animated" used={47} limit={50} />
          <SlotMeter label="animated" used={50} limit={50} />
        </div>
      </div>
      <div className="flex flex-col gap-3 bg-background p-6 sm:col-span-2">
        <p className="font-mono text-muted text-xs">
          &lt;Notice title action&gt; · a heads-up that doesn&apos;t block
        </p>
        <Notice
          title="this GIF is 7.40 MB and the editor is made for smaller ones"
          action={
            <Button variant="ghost" size="sm">
              continue anyway
            </Button>
          }
        >
          you can keep going, but processing may be slow or fail
        </Notice>
      </div>
    </div>
  );
}
