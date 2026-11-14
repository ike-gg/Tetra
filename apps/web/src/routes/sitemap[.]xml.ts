import { createFileRoute } from "@tanstack/react-router";

import { SITEMAP_XML } from "@/lib/seo-files";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(SITEMAP_XML, {
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        }),
    },
  },
});
