import { infiniteQueryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";
import { syncKey } from "@/lib/stv-sync";

const PAGE_SIZE = 30;
const REFRESH_MS = 30_000;

const fetchSyncLog = (guildId: string, before?: string) =>
  unwrap(
    api.guilds[":guildId"].sync.log.$get({
      param: { guildId },
      query: { limit: String(PAGE_SIZE), before },
    })
  );

export type SyncLogEntry = Awaited<ReturnType<typeof fetchSyncLog>>["entries"][number];

/**
 * The sync's activity log (`["stv-sync", id, "log"]`), newest first, paged by core's
 * cursor. Under `syncKey`, so every sync write refetches it with the review list.
 */
export const syncLogQueryOptions = (guildId: string) =>
  infiniteQueryOptions({
    queryKey: [...syncKey(guildId), "log"],
    queryFn: ({ pageParam }) => fetchSyncLog(guildId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: REFRESH_MS,
  });

const FILTERED: Record<string, string> = {
  static: "static emotes are off",
  animated: "animated emotes are off",
  zero_width: "zero-width emotes are off",
  nsfw: "NSFW emotes are off",
};

const FAILED: Record<string, string> = {
  download: "i couldn't download it from 7TV",
  invalid_file: "i couldn't read the file from 7TV",
  permissions: "tetra needs the manage expressions permission",
  discord: "Discord refused it",
};

// Short forms of core's review messages, for one log line
const reviewReason = ({ reason, detail }: SyncLogEntry) => {
  switch (reason) {
    case "FILTERED":
      return (detail && FILTERED[detail]) ?? "the filters turned it off";
    case "RULE":
      return detail ? `matched rule ${detail}` : "matched a rule";
    case "TOO_LARGE":
      return "won't fit under 256 KB";
    case "ASPECT_RATIO":
      return detail ? `${detail}:1 is past the max aspect ratio` : "too wide or tall";
    case "NO_SLOT":
      return detail ? `no free ${detail} slots` : "no free slots";
    case "FAILED": {
      if (detail && FAILED[detail]) return FAILED[detail];
      const code = detail?.startsWith("unknown:")
        ? detail.slice("unknown:".length)
        : null;
      return code ? `something broke on my side, code ${code}` : "something broke";
    }
    default:
      return null;
  }
};

const setSwitched = (set: SyncLogEntry["set"]) => {
  if (!set?.toSetId) return "no active 7TV set anymore";
  if (!set.fromSetId) return "a 7TV set is active now";
  return "the active 7TV set changed";
};

/** What the sync did, as one short line; the emote is shown next to it. */
export const syncLogAction = (
  entry: SyncLogEntry
): { text: string; tone?: "attention" | "danger" } => {
  switch (entry.action) {
    case "added":
      return { text: "added" };
    case "added_retry":
      return { text: "added on retry" };
    case "added_upload":
      return { text: "added from the editor" };
    case "removed":
      return { text: "removed, it left the 7TV set" };
    case "review": {
      const reason = reviewReason(entry);
      return {
        text: reason ? `needs review: ${reason}` : "needs review",
        tone: "attention",
      };
    }
    case "skipped_rule":
      return {
        text: entry.detail ? `skipped by rule ${entry.detail}` : "skipped by a rule",
      };
    case "review_removed":
      return { text: "left the 7TV set, so it no longer needs review" };
    case "link_dropped":
      return { text: "removed on Discord, the sync lets it go" };
    case "dismissed":
      return { text: entry.excluded ? "dismissed, never sync it" : "dismissed" };
    case "failed": {
      const verb = entry.failure?.stage === "remove" ? "remove" : "add";
      const code = entry.failure?.code;
      return {
        text: code ? `i couldn't ${verb} it, code ${code}` : `i couldn't ${verb} it`,
        tone: "danger",
      };
    }
    case "set_switched":
      return { text: setSwitched(entry.set) };
    case "linked":
      return { text: entry.channel?.login ? `linked ${entry.channel.login}` : "linked" };
    case "paused":
      return { text: "sync paused" };
    case "resumed":
      return { text: "sync resumed" };
    default:
      return { text: "something changed" };
  }
};

/** The 7TV preview for a logged emote; the log only keeps the id. */
export const stvPreviewUrl = (stvEmoteId: string) =>
  `https://cdn.7tv.app/emote/${encodeURIComponent(stvEmoteId)}/2x.webp`;
