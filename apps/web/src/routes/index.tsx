import { createFileRoute, Link } from "@tanstack/react-router";

import { EmoteBackground } from "@/components/emote-background";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <EmoteBackground />
      {/*<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(10_10_10/0.75)_0%,rgb(10_10_10/0.25)_40%,transparent_70%)]" />*/}
      {/*<main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
        <h1 className="font-semibold text-4xl">Tetra</h1>
        <p className="text-neutral-400">Emote management Discord bot.</p>
        <Link to="/panel" className="w-fit rounded-md bg-white px-4 py-2 text-black">
          Open panel
        </Link>
      </main>*/}
    </>
  );
}
