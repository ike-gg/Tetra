import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  FEEDBACK_EMOTES,
  type FeedbackEmote,
  FeedbackEmoteMark,
  type Tint,
} from "@/components/feedback-emotes";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { NOINDEX_META } from "@/lib/seo";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [{ title: "Feedback emotes · tetra" }, NOINDEX_META],
  }),
  component: FeedbackPage,
});

const TINTS: [Tint, string][] = [
  ["embed", "embed colors"],
  ["mono", "white"],
];

// 22 px is a custom emoji in an embed title or a message; 48 is a jumbo emoji
const SIZES = [16, 22, 32, 48, 128];

// Example titles, as TetraEmbed and Messages set them
const TITLES: Record<string, { title: string; description: string }> = {
  working: { title: "Working on it...", description: "Fetching catJAM from 7TV." },
  success: { title: "Success", description: "Added catJAM to the server." },
  error: {
    title: "Something went wrong",
    description: "Not found any files in message.",
  },
  warning: {
    title: "Warning",
    description:
      "The bot is rate limited. The action will be carried out once the limit expires.",
  },
  attention: {
    title: "Attention",
    description: "Emote exceeded maximum size. Choose the optimization method.",
  },
  info: { title: "Information", description: "This server has 12 free emote slots." },
  panel: {
    title: "Tetra Panel",
    description: "Manage this server's emotes in the panel.",
  },
  media: { title: "Media", description: "catJAM.gif · 112×112 · 241 KB" },
  premium: { title: "Tetra Premium", description: "Bulk import is part of Premium." },
};

// Discord's own surfaces, to judge the emotes where they will actually sit
const DISCORD = {
  dark: {
    page: "#313338",
    embed: "#2b2d31",
    title: "#f2f3f5",
    text: "#dbdee1",
    label: "dark theme",
  },
  light: {
    page: "#ffffff",
    embed: "#f2f3f5",
    title: "#060607",
    text: "#313338",
    label: "light theme",
  },
};

function FeedbackPage() {
  const [tint, setTint] = useState<Tint>("embed");

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 pt-28 pb-24 sm:px-6">
        <section className="flex flex-col gap-6">
          <Eyebrow index="01">feedback emotes</Eyebrow>
          <Heading level={1}>One ASCII emote per kind of reply.</Heading>
          <Text tone="muted" className="max-w-xl">
            The bot's embeds open with an emoji that says what kind of reply it is:
            colored squares today, a random loading emote while it works. These replace
            them with 128 px custom emotes: a pictogram of dense glyphs on a transparent
            background, with a shadow of the same glyphs one cell down and right at 25%.
            13 characters per side so the shape still reads at the 22 px of an embed
            title. Working is the only animated one.
          </Text>
          <SegmentedControl
            aria-label="Glyph color"
            value={tint}
            onValueChange={(next) => next && setTint(next as Tint)}
            className="self-start"
          >
            {TINTS.map(([value, label]) => (
              <SegmentedControlItem key={value} value={value}>
                {label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="02">the set</Eyebrow>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEEDBACK_EMOTES.map((emote) => (
              <EmoteCard key={emote.id} emote={emote} tint={tint} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="03">sizes</Eyebrow>
          <Text tone="muted" className="max-w-xl">
            22 px is where they live: an embed title or a message. 48 px is a jumbo emoji,
            128 px the uploaded file.
          </Text>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-muted text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-normal">emote</th>
                  {SIZES.map((size) => (
                    <th key={size} className="p-2 text-left font-normal tabular-nums">
                      {size} px
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEEDBACK_EMOTES.map((emote) => (
                  <tr key={emote.id} className="border-border border-t">
                    <td className="p-2 align-bottom text-foreground">{emote.id}</td>
                    {SIZES.map((size) => (
                      <td key={size} className="p-2 align-bottom">
                        <FeedbackEmoteMark emote={emote} tint={tint} size={size} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow index="04">in context</Eyebrow>
          <Heading level={2}>In Discord's embeds, at 22 px.</Heading>
          <Text tone="muted" className="max-w-xl">
            A mock of the embed: the side bar keeps TetraEmbed's color, the emote takes
            the place of the colored square in the title.
          </Text>
          <div className="grid gap-px bg-border lg:grid-cols-2">
            {(["dark", "light"] as const).map((theme) => (
              <EmbedColumn key={theme} theme={theme} tint={tint} />
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

function EmoteCard({ emote, tint }: { emote: FeedbackEmote; tint: Tint }) {
  return (
    <div className="flex flex-col gap-4 bg-surface p-4">
      <FeedbackEmoteMark emote={emote} tint={tint} size={128} />
      <div className="flex flex-col gap-1 font-mono text-xs">
        <span className="text-foreground">:{emote.name}:</span>
        <span className="text-muted">
          {emote.methods.map((method) => `${method}()`).join(", ")} · replaces{" "}
          {emote.replaces}
        </span>
      </div>
      <Text size="sm" tone="muted">
        {emote.idea}
      </Text>
    </div>
  );
}

function EmbedColumn({ theme, tint }: { theme: keyof typeof DISCORD; tint: Tint }) {
  const colors = DISCORD[theme];
  return (
    <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: colors.page }}>
      <p className="font-mono text-xs" style={{ color: colors.text }}>
        {colors.label}
      </p>
      {FEEDBACK_EMOTES.map((emote) => {
        const { title, description } = TITLES[emote.id];
        return (
          <div
            key={emote.id}
            className={cn("flex flex-col gap-1 border-l-4 py-2.5 pr-4 pl-3")}
            style={{
              backgroundColor: colors.embed,
              borderLeftColor: emote.embedColor,
              // Discord rounds embeds; the mock does too, it's their UI, not ours
              borderRadius: 4,
            }}
          >
            <div
              className="flex items-center gap-2 font-semibold text-base"
              style={{ color: colors.title }}
            >
              <FeedbackEmoteMark emote={emote} tint={tint} size={22} />
              {title}
            </div>
            <p className="text-sm" style={{ color: colors.text }}>
              {description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
