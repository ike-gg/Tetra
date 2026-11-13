import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/branding")({
  head: () => ({
    meta: [{ title: "Branding · Tetra" }],
  }),
  component: BrandingPage,
});

const ASCII_RAMP = " .:-=+*#%@";

const COLOR_ROLES = [
  {
    name: "Background",
    token: "background",
    value: "oklch(0.145 0.003 38)",
    swatch: "bg-background",
    use: "The page. surface for raised areas, border for lines.",
  },
  {
    name: "Brand",
    token: "primary · brand-500",
    value: "oklch(0.655 0.214 38) · #f64f02",
    swatch: "bg-primary",
    use: "Primary actions, the key word of a heading, focus, active states.",
  },
  {
    name: "Signal",
    token: "signal · signal-400",
    value: "oklch(0.81 0.13 215)",
    swatch: "bg-signal",
    use: "Rare. One detail per view that must not compete with orange.",
  },
];

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

const PRINCIPLES = [
  ["Square", "No rounded corners, anywhere. Squareness is the brand."],
  [
    "Emotes are the color",
    "The interface stays dark and quiet; emotes carry the energy.",
  ],
  ["ASCII as an accent", "Monospace glyphs nod to chat. Seasoning, not the main course."],
  ["One loud color", "Orange marks what matters. Everything else is neutral."],
];

const VOICE = [
  ["Do", "Add any emote with one command."],
  ["Don't", "Leveraging advanced optimization pipelines for emoji assets."],
  ["Do", "Add to Discord"],
  ["Don't", "Add To Discord"],
];

function Section({
  index,
  title,
  note,
  children,
}: {
  index: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-8 border-border border-t py-16 lg:grid-cols-[16rem_1fr]">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-brand-500 text-xs tracking-widest">[{index}]</p>
        <h2 className="font-semibold text-2xl tracking-tight">{title}</h2>
        <p className="font-mono text-muted text-xs leading-relaxed">{note}</p>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-border border-l px-4 py-1">
      <dt className="font-mono text-[11px] text-muted uppercase tracking-widest">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function BrandingPage() {
  return (
    <div className="min-h-svh bg-background bg-[linear-gradient(var(--color-neutral-900)_1px,transparent_1px),linear-gradient(90deg,var(--color-neutral-900)_1px,transparent_1px)] bg-size-[24px_24px] min-[1152px]:bg-position-[calc(50%-12px)_0]">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <header className="flex flex-col gap-12 py-24">
          <div className="flex h-6 items-center justify-between font-mono text-muted text-xs">
            <Link to="/" className="transition hover:text-foreground">
              ← <span className="text-brand-500">tetra</span>
            </Link>
            <span>docs/branding.md · rev. 2026-11</span>
          </div>
          <div className="relative -mr-px border border-border bg-background/80 p-12 md:h-[289px]">
            <span
              aria-hidden
              className="absolute -top-px -left-px size-3 border-brand-500 border-t border-l"
            />
            <span
              aria-hidden
              className="absolute -top-px -right-px size-3 border-brand-500 border-t border-r"
            />
            <span
              aria-hidden
              className="absolute -bottom-px -left-px size-3 border-brand-500 border-b border-l"
            />
            <span
              aria-hidden
              className="absolute -right-px -bottom-px size-3 border-brand-500 border-r border-b"
            />
            <p className="font-mono text-muted text-xs tracking-widest">
              SHEET 00 / IDENTITY BLUEPRINT
            </p>
            <h1 className="mt-6 text-balance font-semibold text-5xl tracking-tight sm:text-6xl">
              The <span className="font-normal font-serif text-primary">tetra</span>{" "}
              brand.
            </h1>
            <p className="mt-6 max-w-xl text-muted">
              Square, dark and quiet, so the emotes can be loud. This sheet is the
              rendered version of{" "}
              <code className="font-mono text-foreground">docs/branding.md</code>.
              Components land here later.
            </p>
          </div>
        </header>

        <Section index="01" title="Principles" note="Four rules every screen follows.">
          <ol className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {PRINCIPLES.map(([title, body], index) => (
              <li key={title} className="flex flex-col gap-2 bg-background p-6">
                <span className="font-mono text-brand-500 text-xs">0{index + 1}</span>
                <h3 className="font-medium">{title}</h3>
                <p className="text-muted text-sm">{body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          index="02"
          title="Color"
          note="Three roles, dark only. OKLCH tokens in app.css."
        >
          <div className="grid gap-px border border-border bg-border md:grid-cols-3">
            {COLOR_ROLES.map((role) => (
              <article key={role.name} className="flex flex-col bg-background">
                <div className={`h-32 border-border border-b ${role.swatch}`} />
                <dl className="flex flex-col gap-3 p-5">
                  <Spec label="role">{role.name}</Spec>
                  <Spec label="token">
                    <code className="font-mono">{role.token}</code>
                  </Spec>
                  <Spec label="value">
                    <code className="font-mono text-xs">{role.value}</code>
                  </Spec>
                  <Spec label="use">
                    <span className="text-muted">{role.use}</span>
                  </Spec>
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-6">
            {SCALES.map((scale) => (
              <div key={scale.name}>
                <p className="mb-2 font-mono text-muted text-xs">{scale.name}-*</p>
                <div className="flex border border-border">
                  {scale.steps.map(([step, swatch]) => (
                    <div key={step} className="flex flex-1 flex-col">
                      <div className={`h-12 ${swatch}`} />
                      <span className="border-border border-t py-1 text-center font-mono text-[10px] text-muted">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <ul className="mt-10 flex flex-col gap-2 font-mono text-muted text-xs">
            <li>— text on orange or signal is dark: white on #f64f02 fails contrast</li>
            <li>
              — signal: at most one element per view, never next to orange on one element
            </li>
            <li>— body text ≥ 4.5:1, control edges and focus rings ≥ 3:1</li>
          </ul>
        </Section>

        <Section
          index="03"
          title="Typography"
          note="Geist family. Sans by default, serif as the accent, mono for ASCII."
        >
          <div className="flex flex-col gap-px border border-border bg-border">
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">font-sans · Geist · 100–900</p>
              <p className="font-semibold text-4xl tracking-tight">
                Every emote, one command.
              </p>
              <p className="text-muted">
                Default for everything: interface, body text and most headings.
              </p>
            </div>
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                font-serif · Geist Serif · 400 only
              </p>
              <p className="font-serif text-5xl text-primary">emotes</p>
              <p className="text-muted">
                Accent only: one or two words in a heading. Never body text or interface.
              </p>
            </div>
            <div className="flex flex-col gap-3 bg-background p-6">
              <p className="font-mono text-muted text-xs">
                font-mono · Geist Mono · 100–900
              </p>
              <p className="font-mono text-2xl">/addemote emote:catJAM</p>
              <p className="text-muted">
                ASCII art, labels, commands, technical captions.
              </p>
            </div>
          </div>
        </Section>

        <Section index="04" title="Shape" note="Radius is always 0. Lines over shadows.">
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            <div className="flex items-center justify-center bg-background p-10">
              <div className="relative size-32 border border-brand-500">
                <span className="absolute -top-6 left-0 font-mono text-[10px] text-brand-500">
                  r = 0
                </span>
              </div>
            </div>
            <ul className="flex flex-col justify-center gap-3 bg-background p-8 text-sm">
              <li>Every --radius-* token is 0, so is ui-sdk&apos;s --ui-radius.</li>
              <li>
                No <code className="font-mono">rounded-full</code> either: dots, avatars
                and pills are square.
              </li>
              <li>
                Structure comes from 1px hairlines and shared borders between cards.
              </li>
              <li>No shadows, except the orange glow on the main call to action.</li>
            </ul>
          </div>
        </Section>

        <Section
          index="05"
          title="ASCII"
          note="The accent. One ASCII moment per block, always aria-hidden."
        >
          <div className="border border-border bg-background p-6">
            <p className="font-mono text-muted text-xs">ramp · light → dense</p>
            <div className="mt-4 grid grid-cols-10 border border-border">
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
          </div>
          <ul className="mt-6 grid gap-2 font-mono text-muted text-xs sm:grid-cols-2">
            <li>+ character illustrations in feature cards</li>
            <li>+ section labels: [01] / features</li>
            <li>+ terminal command lines</li>
            <li>+ faint texture, brand-500 at ~10%</li>
            <li>+ decode effect on an accent word</li>
            <li>− meaning that only exists in ASCII</li>
          </ul>
        </Section>

        <Section
          index="06"
          title="Motion"
          note="Quiet by default, a few signature moments."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <Spec label="entrance">Rise and un-blur, 0.9s, staggered ~150 ms</Spec>
            <Spec label="signature">Orange wave, ASCII decode, block cursor</Spec>
            <Spec label="hover">Color and position shifts, no scaling</Spec>
            <Spec label="reduced motion">
              Content appears instantly, background stops
            </Spec>
          </dl>
        </Section>

        <Section index="07" title="Voice" note="Speak like chat, write like a tool.">
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {VOICE.map(([kind, text]) => (
              <div key={text} className="flex flex-col gap-2 bg-background p-6">
                <span
                  className={`font-mono text-xs ${kind === "Do" ? "text-brand-500" : "text-muted"}`}
                >
                  {kind === "Do" ? "+ do" : "− don't"}
                </span>
                <p className={kind === "Do" ? "" : "text-muted line-through"}>{text}</p>
              </div>
            ))}
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-muted text-sm">
            <li>Lead with what the user gets, not with technology.</li>
            <li>English, sentence case for headings and buttons.</li>
            <li>
              Wordmark: lowercase <span className="font-mono text-brand-500">tetra</span>{" "}
              in Geist Mono. No logo yet.
            </li>
            <li>Never claim what isn&apos;t verified: pricing, permissions, numbers.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
