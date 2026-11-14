import { Link } from "@tanstack/react-router";

import { EmotePile } from "@/components/emote-pile";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

// The router's not-found UI, also prerendered to 404.html for Caddy's real 404s
export function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Only the button takes pointer events, so presses elsewhere reach the emotes */}
        <section className="pointer-events-none relative isolate flex min-h-svh items-center justify-center overflow-hidden px-6 py-24">
          <div className="pointer-events-auto absolute inset-0 -z-10">
            <EmotePile className="h-full w-full bg-neutral-950" />
          </div>
          <div className="flex flex-col items-center text-center">
            <Eyebrow>page not found</Eyebrow>
            <Heading
              level={1}
              className="mt-4 text-[clamp(6rem,24vw,13rem)] leading-none tracking-tighter"
            >
              404
            </Heading>
            <Text size="lg" tone="muted" className="mt-6 max-w-md text-balance">
              This page got timed out. The emotes didn&apos;t, so go ahead and throw them
              around.
            </Text>
            <Button
              variant="primary"
              size="lg"
              className="pointer-events-auto mt-10"
              render={<Link to="/" />}
            >
              Back home
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
