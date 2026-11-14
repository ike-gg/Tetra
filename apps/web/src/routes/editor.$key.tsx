import { createFileRoute } from "@tanstack/react-router";

// The key only exists in this browser's storage, so there's nothing to prerender
export const Route = createFileRoute("/editor/$key")({
  ssr: false,
  head: () => ({ meta: [{ title: "Image/GIF quick editor · Tetra" }] }),
});
