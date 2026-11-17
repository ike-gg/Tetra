import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncQueue } from "@/db/schema";
import { reportWithCode } from "@/utils/error-code";

import type { SyncSettings } from "./settings";
import type { SyncEmoteSource } from "./sync-emote";

export type QueueReason =
  | "FILTERED"
  | "TOO_LARGE"
  | "ASPECT_RATIO"
  | "NO_SLOT"
  | "FAILED";

/**
 * FILTERED: the filter (`SyncFilter`). ASPECT_RATIO: the ratio, e.g. `3.20`. NO_SLOT:
 * `static` / `animated` (null when Discord refused without a count). FAILED: `download`,
 * `invalid_file`, `permissions`, `discord`, or `unknown:<error code>`.
 */
export type QueueDetail = string | null;

export type QueueRow = typeof stvSyncQueue.$inferSelect;

export const upsertQueueEntry = async (
  guildId: string,
  emote: SyncEmoteSource,
  reason: QueueReason,
  detail: QueueDetail,
  fromFile: { animated?: boolean; width?: number; height?: number } = {}
) => {
  const values = {
    name: emote.name,
    animated: fromFile.animated ?? emote.animated,
    fileUrl: emote.fileUrl,
    previewUrl: emote.previewUrl,
    width: fromFile.width ?? emote.width,
    height: fromFile.height ?? emote.height,
    author: emote.author,
    reason,
    detail,
    queuedAt: new Date(),
  };
  await db
    .insert(stvSyncQueue)
    .values({ guildId, stvEmoteId: emote.stvEmoteId, ...values })
    .onConflictDoUpdate({
      target: [stvSyncQueue.guildId, stvSyncQueue.stvEmoteId],
      set: values,
    });
};

export const removeQueueEntryForEmote = async (guildId: string, stvEmoteId: string) => {
  const removed = await db
    .delete(stvSyncQueue)
    .where(
      and(eq(stvSyncQueue.guildId, guildId), eq(stvSyncQueue.stvEmoteId, stvEmoteId))
    )
    .returning({ id: stvSyncQueue.id });
  return removed.length > 0;
};

/** One entry, only if it belongs to the guild. */
export const getQueueEntry = (guildId: string, entryId: number) =>
  db.query.stvSyncQueue.findFirst({
    where: and(eq(stvSyncQueue.id, entryId), eq(stvSyncQueue.guildId, guildId)),
  });

export const listQueue = (guildId: string) =>
  db
    .select()
    .from(stvSyncQueue)
    .where(eq(stvSyncQueue.guildId, guildId))
    .orderBy(desc(stvSyncQueue.queuedAt), desc(stvSyncQueue.id));

export const toSyncSource = (row: QueueRow): SyncEmoteSource => ({
  stvEmoteId: row.stvEmoteId,
  name: row.name,
  animated: row.animated,
  fileUrl: row.fileUrl,
  previewUrl: row.previewUrl,
  width: row.width,
  height: row.height,
  author: row.author,
});

const FILTER_MESSAGES: Record<string, string> = {
  static: "static emotes are turned off in the sync filters",
  animated: "animated emotes are turned off in the sync filters",
  zero_width: "zero-width emotes are skipped in the sync filters",
  nsfw: "7TV marks this emote as NSFW, and NSFW emotes are skipped",
  name: "the name doesn't contain any of your filter words",
  regex: "the name doesn't match your filter pattern",
  author: "its author is filtered out",
  excluded: "you excluded this emote from the sync",
};

/** The reason in tetra's voice (docs/voice.md), for the panel. */
export const queueMessage = (
  row: Pick<QueueRow, "reason" | "detail">,
  settings: SyncSettings
): string => {
  const { reason, detail } = row;
  switch (reason) {
    case "FILTERED":
      return (detail && FILTER_MESSAGES[detail]) ?? "a sync filter skipped it";
    case "TOO_LARGE":
      return "i couldn't get it under Discord's 256 KB limit. shorten or shrink it in the editor";
    case "ASPECT_RATIO":
      return `it's ${detail ?? "too wide"}:1 and the sync fits up to ${settings.optimization.maxAspectRatio}:1 on its own. crop it in the editor`;
    case "NO_SLOT":
      return detail
        ? `this server has no free ${detail} emote slots. remove one, then retry`
        : "this server has no free emote slots. remove one, then retry";
    case "FAILED": {
      if (detail === "download") return "i couldn't download it from 7TV. retry in a bit";
      if (detail === "invalid_file") {
        return "i couldn't read the file from 7TV. try it in the editor";
      }
      if (detail === "permissions") {
        return "tetra needs the manage expressions permission on this server. fix it, then retry";
      }
      if (detail === "discord")
        return "Discord refused it. retry, or edit it in the editor";
      const code = detail?.startsWith("unknown:")
        ? detail.slice("unknown:".length)
        : null;
      return code
        ? `something broke on my side. ${reportWithCode(code)}`
        : "something broke on my side. retry, and if it keeps happening, report it";
    }
    default:
      return "it wasn't added";
  }
};
