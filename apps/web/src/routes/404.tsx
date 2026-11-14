import { createFileRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/components/not-found-page";
import { NOINDEX_META } from "@/lib/seo";

// Exists only to be prerendered to 404.html, which Caddy serves for unknown paths
export const Route = createFileRoute("/404")({
  head: () => ({ meta: [{ title: "404 · tetra" }, NOINDEX_META] }),
  component: NotFoundPage,
});
