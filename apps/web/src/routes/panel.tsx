import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";

type PanelSearch = {
  // Set by the API's OAuth callback when a login failed (`AUTH_CALLBACK_ERRORS` in core)
  error?: string;
};

export const Route = createFileRoute("/panel")({
  ssr: false,
  // The SPA shell renders only this route, so /panel's SEO tags live here. Links from a
  // layout reach every child, so the canonical is emitted for the panel root only.
  head: ({ matches }) => {
    const leaf = matches.at(-1)?.routeId;
    return leaf === "/panel" || leaf === "/panel/"
      ? seoHead("panel")
      : { meta: [{ title: "Panel · tetra" }] };
  },
  validateSearch: (search: Record<string, unknown>): PanelSearch =>
    typeof search.error === "string" ? { error: search.error } : {},
});
