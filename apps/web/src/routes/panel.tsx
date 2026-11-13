import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/panel")({
  ssr: false,
  component: PanelPage,
});

function PanelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="font-semibold text-2xl">Panel</h1>
      <p className="text-neutral-400">Client-only part of the app.</p>
      <Link to="/" className="text-neutral-400 underline">
        Back home
      </Link>
    </main>
  );
}
