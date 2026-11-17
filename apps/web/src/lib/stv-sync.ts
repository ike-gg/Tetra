import { queryOptions } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "@/lib/api";
import { emoteErrorMessage } from "@/lib/emote-mutations";

const fetchSyncState = (guildId: string) =>
  unwrap(api.guilds[":guildId"].sync.$get({ param: { guildId } }));

export type SyncState = Awaited<ReturnType<typeof fetchSyncState>>;
export type LinkedSync = NonNullable<SyncState["sync"]>;
export type SyncSettings = SyncState["defaults"];
export type SyncConnection = SyncState["connection"];

// Connection state and counts move on their own (events, reconnects), so a page that
// stays open picks them up
const REFRESH_MS = 30_000;

/** Every sync query of a server starts with this key; invalidating it refreshes all. */
export const syncKey = (guildId: string) => ["stv-sync", guildId] as const;

/** The server's 7TV sync (`["stv-sync", id, "state"]`, `GET /guilds/:id/sync`). */
export const syncQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: [...syncKey(guildId), "state"],
    queryFn: () => fetchSyncState(guildId),
    refetchInterval: REFRESH_MS,
  });

const fetchQueue = (guildId: string) =>
  unwrap(api.guilds[":guildId"].sync.queue.$get({ param: { guildId } }));

export type QueueEntry = Awaited<ReturnType<typeof fetchQueue>>["entries"][number];

/** Emotes the sync couldn't add, newest first (`["stv-sync", id, "queue"]`). */
export const syncQueueQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: [...syncKey(guildId), "queue"],
    queryFn: async () => (await fetchQueue(guildId)).entries,
    refetchInterval: REFRESH_MS,
  });

/** A sentence for the sync's own error codes; anything else as for emotes. */
export const syncErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    switch (error.reference) {
      case "CHANNEL_NOT_FOUND":
        return "i couldn't find that Twitch channel. check the name";
      case "STV_USER_NOT_FOUND":
        return "this Twitch channel has no 7TV account, so there's nothing to sync";
      case "UPSTREAM_ERROR":
        return "Twitch or 7TV didn't answer. try again in a moment";
      case "SYNC_NOT_LINKED":
        return "this server doesn't sync a channel anymore. reload the page to set it up again";
      case "QUEUE_ENTRY_NOT_FOUND":
        return "this emote isn't in the queue anymore";
      case "EMOTE_ALREADY_SYNCED":
        return "this emote is already synced to the server";
    }
  }
  return emoteErrorMessage(error);
};

const CONNECTION_LABELS: Record<SyncConnection["state"], string> = {
  disabled: "off on this tetra instance",
  stopped: "not running",
  idle: "waiting",
  connecting: "connecting to 7TV",
  connected: "connected to 7TV",
  reconnecting: "reconnecting to 7TV",
};

/** One line on whether events from the channel's set reach tetra right now. */
export const connectionStatus = (
  connection: SyncConnection,
  sync: LinkedSync
): { label: string; tone: "live" | "busy" | "off" } => {
  if (!sync.enabled) return { label: "paused", tone: "off" };
  if (!sync.channel.emoteSetId) return { label: "no active 7TV set", tone: "off" };
  const { state, subscribed } = connection;
  if (state === "connecting" || state === "reconnecting") {
    return { label: CONNECTION_LABELS[state], tone: "busy" };
  }
  if (state === "connected") {
    return subscribed
      ? { label: "connected · following the active set", tone: "live" }
      : { label: "connected · not following the set yet", tone: "busy" };
  }
  return { label: CONNECTION_LABELS[state], tone: "off" };
};

// Same rules as core's settings schema, so the form says what's wrong before saving
export const SETTINGS_LIMITS = {
  nameContains: { count: 50, length: 32 },
  nameRegex: 100,
  authors: { count: 100, length: 64 },
  maxAspectRatio: { min: 1, max: 8 },
} as const;

/** Comma or space separated words, trimmed, without empties or duplicates. */
export const parseList = (text: string) => [
  ...new Set(
    text
      .split(/[\s,]+/)
      .map((word) => word.trim())
      .filter(Boolean)
  ),
];

/** Core checks the same, plus nested repeats like `(a+)+`, which only it rejects. */
export const nameRegexError = (pattern: string) => {
  if (pattern.length > SETTINGS_LIMITS.nameRegex) {
    return `keep it under ${SETTINGS_LIMITS.nameRegex} characters`;
  }
  try {
    new RegExp(pattern, "i");
    return undefined;
  } catch {
    return "that isn't a valid regular expression";
  }
};

export const listError = (
  words: string[],
  { count, length }: { count: number; length: number },
  noun: string
) => {
  if (words.length > count) return `up to ${count} ${noun}`;
  if (words.some((word) => word.length > length)) {
    return `each one can be up to ${length} characters`;
  }
  return undefined;
};
