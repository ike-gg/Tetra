import { createFileRoute } from "@tanstack/react-router";

import { NOINDEX_META } from "@/lib/seo";

// The key only exists in this browser's storage, so there's nothing to prerender
export const Route = createFileRoute("/editor/$key")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editor · tetra" }, NOINDEX_META] }),
});
