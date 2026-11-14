import { createFileRoute } from "@tanstack/react-router";

import { ROBOTS_TXT } from "@/lib/seo-files";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(ROBOTS_TXT, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
