import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncReview } from "@/db/schema";
import { reportWithCode } from "@/utils/error-code";

import type { SyncSettings } from "./settings";
import type { SyncEmoteSource } from "./sync-emote";

export type ReviewReason =
  | "FILTERED"
  | "RULE"
  | "TOO_LARGE"
  | "ASPECT_RATIO"
  | "NO_SLOT"
  | "FAILED";

/**
 * FILTERED: the basic filter (`SyncFilter`). RULE: the rule's 1-based position. ASPECT_RATIO:
 * the ratio, e.g. `3.20`. NO_SLOT: `static` / `animated` (null when Discord refused without
 * a count). FAILED: `download`, `invalid_file`, `permissions`, `discord`, or
 * `unknown:<error code>`.
 */
export type ReviewDetail = string | null;

export type ReviewRow = typeof stvSyncReview.$inferSelect;

export const upsertReviewEntry = async (
  guildId: string,
  emote: SyncEmoteSource,
  reason: ReviewReason,
  detail: ReviewDetail,
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
    flaggedAt: new Date(),
  };
  await db
    .insert(stvSyncReview)
    .values({ guildId, stvEmoteId: emote.stvEmoteId, ...values })
    .onConflictDoUpdate({
      target: [stvSyncReview.guildId, stvSyncReview.stvEmoteId],
      set: values,
    });
};

/** The removed entry's alias and type, undefined when there was none. */
export const removeReviewEntryForEmote = async (guildId: string, stvEmoteId: string) => {
  const [removed] = await db
    .delete(stvSyncReview)
    .where(
      and(eq(stvSyncReview.guildId, guildId), eq(stvSyncReview.stvEmoteId, stvEmoteId))
    )
    .returning({ name: stvSyncReview.name, animated: stvSyncReview.animated });
  return removed;
};

/** One entry, only if it belongs to the guild. */
export const getReviewEntry = (guildId: string, entryId: number) =>
  db.query.stvSyncReview.findFirst({
    where: and(eq(stvSyncReview.id, entryId), eq(stvSyncReview.guildId, guildId)),
  });

export const listReview = (guildId: string) =>
  db
    .select()
    .from(stvSyncReview)
    .where(eq(stvSyncReview.guildId, guildId))
    .orderBy(desc(stvSyncReview.flaggedAt), desc(stvSyncReview.id));

export const toSyncSource = (row: ReviewRow): SyncEmoteSource => ({
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
  static: "static emotes are turned off in the sync settings",
  animated: "animated emotes are turned off in the sync settings",
  zero_width: "zero-width emotes are turned off in the sync settings",
  nsfw: "7TV marks this emote as sensitive, and those are turned off in the sync settings",
};

/** The reason in tetra's voice (docs/voice.md), for the panel. */
export const reviewMessage = (
  row: Pick<ReviewRow, "reason" | "detail">,
  settings: SyncSettings
): string => {
  const { reason, detail } = row;
  switch (reason) {
    case "FILTERED":
      return (detail && FILTER_MESSAGES[detail]) ?? "the sync settings turned it off";
    case "RULE":
      return detail ? `it matched rule ${detail}` : "it matched one of your rules";
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
