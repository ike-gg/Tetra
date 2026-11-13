import { createFileRoute } from "@tanstack/react-router";

import { EmoteBackground } from "@/components/emote-background";
import { Hero } from "@/components/hero";
import { HomeSections } from "@/components/home-sections";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <EmoteBackground />
      <main>
        <Hero />
        <HomeSections />
      </main>
    </>
  );
}
