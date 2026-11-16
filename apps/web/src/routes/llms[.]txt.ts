import { createFileRoute } from "@tanstack/react-router";

import { LLMS_TXT } from "@/lib/seo-files";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(LLMS_TXT, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
