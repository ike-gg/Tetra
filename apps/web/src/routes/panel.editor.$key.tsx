import { createFileRoute } from "@tanstack/react-router";

import { NOINDEX_META } from "@/lib/seo";

// Set when the file came from a server's 7TV sync queue: "add" then goes to that entry
type EditorSearch = { syncGuild?: string; syncEntry?: number };

// The editor and its engines load with the lazy half of the route
export const Route = createFileRoute("/panel/editor/$key")({
  head: () => ({ meta: [{ title: "editor · tetra" }, NOINDEX_META] }),
  validateSearch: (search: Record<string, unknown>): EditorSearch => {
    const guild = typeof search.syncGuild === "string" ? search.syncGuild : "";
    const entry = Number(search.syncEntry);
    return /^\d{1,20}$/.test(guild) && Number.isInteger(entry) && entry > 0
      ? { syncGuild: guild, syncEntry: entry }
      : {};
  },
});
