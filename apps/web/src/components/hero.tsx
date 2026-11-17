import { Link } from "@tanstack/react-router";

import { AddEmoteDemo } from "@/components/add-emote-demo";
import { EmoteDropText } from "@/components/emote-drop-text";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { INVITE_URL } from "@/lib/links";

// Lets the heading's rise get under way before the emotes start falling
const ACCENT_DROP_DELAY_MS = 500;

export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh items-center justify-center px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_45%,var(--color-background)_20%,transparent_100%)] opacity-90"
      />

      <div className="flex max-w-3xl flex-col items-center text-center">
        <Heading
          level={1}
          className="motion-safe:animate-hero-rise [animation-delay:350ms]"
        >
          <span className="block">add any emote.</span>
          <Accent>
            <EmoteDropText text="that's it" delayMs={ACCENT_DROP_DELAY_MS} />
          </Accent>
        </Heading>

        <Text
          size="lg"
          tone="muted"
          className="motion-safe:animate-hero-rise mt-6 max-w-xl text-balance [animation-delay:500ms]"
        >
          type a name or paste a link from 7TV, BTTV or FFZ. tetra shrinks it to fit
          Discord&apos;s 256 KB limit, so there&apos;s nothing to tweak
        </Text>

        <div className="motion-safe:animate-hero-rise mt-10 flex flex-col items-center gap-3 sm:flex-row [animation-delay:650ms]">
          <Button
            variant="primary"
            size="lg"
            glow
            render={<a href={INVITE_URL} data-track-location="hero" />}
          >
            add to discord
            <span aria-hidden className="font-mono group-hover/button:translate-x-0.5">
              →
            </span>
          </Button>
          <Button size="lg" render={<Link to="/panel" />}>
            open panel
          </Button>
        </div>

        <AddEmoteDemo className="motion-safe:animate-hero-rise mt-14 [animation-delay:800ms]" />
      </div>
    </section>
  );
}
