import { createFileRoute } from "@tanstack/react-router";

import { NOINDEX_META } from "@/lib/seo";

// The editor and its engines load with the lazy half of the route
export const Route = createFileRoute("/panel/tasks/$taskId")({
  head: () => ({ meta: [{ title: "Editor · Panel · Tetra" }, NOINDEX_META] }),
});
