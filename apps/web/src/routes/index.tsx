import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="font-semibold text-4xl">Tetra</h1>
      <p className="text-neutral-400">Emote management Discord bot.</p>
      <Link to="/panel" className="w-fit rounded-md bg-white px-4 py-2 text-black">
        Open panel
      </Link>
    </main>
  );
}
