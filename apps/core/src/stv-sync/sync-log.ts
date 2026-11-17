import { and, desc, eq, lt, or, sql } from "drizzle-orm";

import { TIME } from "@/constants/time";
import { db } from "@/db";
import { stvSyncLog } from "@/db/schema";

import type { ReviewDetail, ReviewReason } from "./review";

import { StvSyncConsole } from "#/loggers";

export const SYNC_LOG_MAX_ENTRIES = 200;
export const SYNC_LOG_MAX_AGE = 30 * TIME.DAY;

export interface SyncLogEmote {
  stvEmoteId: string;
  /** The alias in the set at the time; null when 7TV didn't send it (removals). */
  name: string | null;
  animated: boolean | null;
  discordEmojiId?: string | null;
}

/** What gets logged. Silent skips (already linked, "never sync") are not logged. */
export type SyncLogInput =
  | { action: "added" | "added_retry" | "added_upload"; emote: SyncLogEmote }
  | { action: "removed" | "review_removed" | "link_dropped"; emote: SyncLogEmote }
  | {
      action: "review";
      emote: SyncLogEmote;
      reason: ReviewReason;
      detail: ReviewDetail;
    }
  | { action: "skipped_rule"; emote: SyncLogEmote; rule: number }
  | { action: "dismissed"; emote: SyncLogEmote; excluded: boolean }
  | { action: "failed"; emote: SyncLogEmote; stage: "add" | "remove"; code: string }
  | { action: "set_switched"; fromSetId: string | null; toSetId: string | null }
  | { action: "linked"; login: string; twitchId: string }
  | { action: "paused" | "resumed" };

export type SyncLogAction = SyncLogInput["action"];

type SyncLogRow = typeof stvSyncLog.$inferSelect;

const toColumns = (input: SyncLogInput) => {
  const emote = "emote" in input ? input.emote : null;
  const base = {
    action: input.action,
    stvEmoteId: emote?.stvEmoteId ?? null,
    name: emote?.name?.slice(0, 128) ?? null,
    animated: emote?.animated ?? null,
    discordEmojiId: emote?.discordEmojiId ?? null,
    reason: null as string | null,
    detail: null as string | null,
  };
  switch (input.action) {
    case "review":
      return { ...base, reason: input.reason, detail: input.detail };
    case "skipped_rule":
      return { ...base, detail: String(input.rule) };
    case "dismissed":
      return { ...base, detail: input.excluded ? "excluded" : null };
    case "failed":
      return { ...base, reason: input.stage, detail: input.code };
    case "set_switched":
      return { ...base, reason: input.fromSetId, detail: input.toSetId };
    case "linked":
      return { ...base, name: input.login, detail: input.twitchId };
    default:
      return base;
  }
};

/** Keeps the newest entries of a guild within the count and age limits. */
const trim = async (guildId: string) => {
  const cutoff = new Date(Date.now() - SYNC_LOG_MAX_AGE);
  await db
    .delete(stvSyncLog)
    .where(
      and(
        eq(stvSyncLog.guildId, guildId),
        or(
          lt(stvSyncLog.createdAt, cutoff),
          lt(
            stvSyncLog.id,
            sql`(select ${stvSyncLog.id} from ${stvSyncLog} where ${stvSyncLog.guildId} = ${guildId} order by ${stvSyncLog.id} desc offset ${SYNC_LOG_MAX_ENTRIES - 1} limit 1)`
          )
        )
      )
    );
};

/**
 * Adds an entry to the guild's activity log. Never throws: the log must not break the
 * sync, so failures are only printed.
 */
export const logSyncActivity = async (guildId: string, input: SyncLogInput) => {
  try {
    await db.insert(stvSyncLog).values({ guildId, ...toColumns(input) });
    await trim(guildId);
  } catch (error) {
    StvSyncConsole.error(
      `[guild ${guildId}] writing the activity log (${input.action}) failed:`,
      error instanceof Error ? error.message.split("\n")[0] : String(error)
    );
  }
};

/** Newest first; `before` = the id of the last entry of the previous page. */
export const listSyncLog = (guildId: string, limit: number, before?: number) =>
  db
    .select()
    .from(stvSyncLog)
    .where(
      and(
        eq(stvSyncLog.guildId, guildId),
        before === undefined ? undefined : lt(stvSyncLog.id, before)
      )
    )
    .orderBy(desc(stvSyncLog.id))
    .limit(limit);

const emoteOf = (row: SyncLogRow) =>
  row.stvEmoteId
    ? {
        stvEmoteId: row.stvEmoteId,
        name: row.name,
        animated: row.animated,
        discordEmojiId: row.discordEmojiId,
      }
    : null;

/** The panel's view of a log entry; unknown stored values fall back to null. */
export const serializeSyncLogEntry = (row: SyncLogRow) => {
  const action = row.action as SyncLogAction;
  return {
    id: row.id,
    action,
    createdAt: row.createdAt.toISOString(),
    /** Null for channel actions (`set_switched`, `linked`, `paused`, `resumed`). */
    emote: emoteOf(row),
    /** `review`: the review reason. */
    reason: action === "review" ? (row.reason as ReviewReason) : null,
    /** `review`: the review detail; `skipped_rule`: the rule's position. */
    detail: action === "review" || action === "skipped_rule" ? row.detail : null,
    /** `dismissed`: also put on the "never sync" list. */
    excluded: action === "dismissed" ? row.detail === "excluded" : null,
    /** `failed`: where it broke and the error code from the server log. */
    failure:
      action === "failed"
        ? { stage: row.reason as "add" | "remove", code: row.detail ?? "" }
        : null,
    /** `set_switched`: the old and new active 7TV set (null = none). */
    set:
      action === "set_switched" ? { fromSetId: row.reason, toSetId: row.detail } : null,
    /** `linked`: the channel. */
    channel:
      action === "linked" ? { login: row.name ?? "", twitchId: row.detail ?? "" } : null,
  };
};

export type SyncLogEntry = ReturnType<typeof serializeSyncLogEntry>;
