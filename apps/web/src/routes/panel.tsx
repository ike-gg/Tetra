import { createFileRoute } from "@tanstack/react-router";

type PanelSearch = {
  // Set by the API's OAuth callback when a login failed (`AUTH_CALLBACK_ERRORS` in core)
  error?: string;
};

export const Route = createFileRoute("/panel")({
  ssr: false,
  head: () => ({ meta: [{ title: "Panel · Tetra" }] }),
  validateSearch: (search: Record<string, unknown>): PanelSearch =>
    typeof search.error === "string" ? { error: search.error } : {},
});
