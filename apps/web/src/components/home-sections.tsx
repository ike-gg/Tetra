import { Link } from "@tanstack/react-router";

const INVITE_URL = "https://tetra.lol/invite";

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

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="font-mono text-muted text-xs tracking-widest">
      <span className="text-brand-500">[{index}]</span> / {children}
    </p>
  );
}

export function HomeSections() {
  return (
    <div className="relative bg-linear-to-b from-transparent via-background/85 via-30% to-background">
      <section className="mx-auto max-w-6xl px-6 pt-40 pb-28">
        <SectionLabel index="01">features</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
          Built for chats that speak in{" "}
          <span className="font-normal font-serif text-primary">emotes</span>.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group flex flex-col gap-6 bg-background p-8 transition-colors hover:bg-surface"
            >
              <pre
                aria-hidden
                className="font-mono text-muted text-sm leading-tight transition-colors group-hover:text-brand-500"
              >
                {feature.art.join("\n")}
              </pre>
              <div>
                <h3 className="font-medium text-lg">{feature.title}</h3>
                <p className="mt-2 text-muted">{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <SectionLabel index="02">how it works</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
          Three steps, <span className="font-normal font-serif text-primary">zero</span>{" "}
          resizing.
        </h2>

        <ol className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.command} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-brand-500">0{index + 1}</span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>
              <code className="w-fit rounded-md border border-border bg-surface px-2 py-1 font-mono text-foreground text-sm">
                {step.command}
              </code>
              <p className="text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-8 py-20 text-center">
          <pre
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-[10px] text-brand-500/10 leading-[11px]"
          >
            {Array.from({ length: 40 }, (_, row) =>
              ".:-=+*#%@".repeat(30).slice(row % 9, (row % 9) + 220)
            ).join("\n")}
          </pre>
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Give your server{" "}
              <span className="font-normal font-serif text-primary">better</span> emotes.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">Takes a minute to set up.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={INVITE_URL}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground transition hover:bg-primary-hover"
              >
                Add to Discord <span aria-hidden>→</span>
              </a>
              <Link
                to="/panel"
                className="inline-flex h-12 items-center rounded-lg border border-border px-6 font-medium transition hover:border-neutral-600"
              >
                Open panel
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-border border-t px-6 py-10 font-mono text-muted text-xs sm:flex-row">
        <span>
          <span className="text-brand-500">tetra</span> · emote manager for discord
        </span>
        <nav className="flex gap-6">
          <a href={INVITE_URL} className="transition hover:text-foreground">
            invite
          </a>
          <Link to="/panel" className="transition hover:text-foreground">
            panel
          </Link>
        </nav>
      </footer>
    </div>
  );
}
