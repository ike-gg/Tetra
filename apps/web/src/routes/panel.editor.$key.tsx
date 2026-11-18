import { createFileRoute } from "@tanstack/react-router";

import { validateSyncSearch } from "@/components/editor/editor-host";
import { NOINDEX_META } from "@/lib/seo";

// The editor and its engines load with the lazy half of the route
export const Route = createFileRoute("/panel/editor/$key")({
  head: () => ({ meta: [{ title: "editor · tetra" }, NOINDEX_META] }),
  validateSearch: validateSyncSearch,
});
