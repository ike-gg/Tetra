// Lives in the lazy route file so ui-sdk's stylesheet is only loaded by the panel
import "@/styles/panel.css";

import { createLazyFileRoute, Link } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/panel")({
  component: PanelPage,
});

function PanelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="font-semibold text-2xl">Panel</h1>
      <p className="text-muted">Client-only part of the app.</p>
      <Link to="/" className="text-muted underline">
        Back home
      </Link>
    </main>
  );
}
