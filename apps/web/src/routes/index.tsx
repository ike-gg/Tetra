import { createFileRoute } from "@tanstack/react-router";

import { EmoteBackground } from "@/components/emote-background";
import { Hero } from "@/components/hero";
import { HomeSections } from "@/components/home-sections";
import { Navbar } from "@/components/navbar";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <EmoteBackground />
      <Navbar logoIntro={false} />
      <main>
        <Hero />
        <HomeSections />
      </main>
    </>
  );
}
