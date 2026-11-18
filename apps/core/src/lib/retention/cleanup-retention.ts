import { inArray, lt, or, sql } from "drizzle-orm";

import { RETENTION, retentionCutoff } from "@/constants/retention";
import { TIME } from "@/constants/time";
import { db } from "@/db";
import { editorTasks, removedEmotes } from "@/db/schema";

import { deleteEditorTasks, deleteOrphanedEmotes } from "./emote-records";

import { CoreConsole } from "#/loggers";

const CLEANUP_INTERVAL = TIME.HOUR;

let cleanupTimer: ReturnType<typeof setInterval> | undefined;

/** Deletes expired editor tasks and removed emotes, rows over the per-user/guild caps and orphaned emotes. */
export const deleteExpiredEmoteRecords = () =>
  db.transaction(async (tx) => {
    const now = Date.now();

    const overUserCap = sql<string>`(
      select ranked.id from (
        select ${editorTasks.id} as id, row_number() over (
          partition by ${editorTasks.userId}
          order by ${editorTasks.createdAt} desc, ${editorTasks.id} desc
        ) as rn
        from ${editorTasks}
      ) ranked
      where ranked.rn > ${RETENTION.EDITOR_TASKS_PER_USER}
    )`;

    const tasks = await deleteEditorTasks(
      tx,
      or(
        lt(editorTasks.createdAt, retentionCutoff(RETENTION.EDITOR_TASK_MAX_AGE, now)),
        inArray(editorTasks.id, overUserCap)
      )
    );

    const overGuildCap = sql<number>`(
      select ranked.id from (
        select ${removedEmotes.id} as id, row_number() over (
          partition by ${removedEmotes.guildId}
          order by ${removedEmotes.removedAt} desc, ${removedEmotes.id} desc
        ) as rn
        from ${removedEmotes}
      ) ranked
      where ranked.rn > ${RETENTION.REMOVED_EMOTES_PER_GUILD}
    )`;

    const removed = await tx
      .delete(removedEmotes)
      .where(
        or(
          lt(
            removedEmotes.removedAt,
            retentionCutoff(RETENTION.REMOVED_EMOTE_MAX_AGE, now)
          ),
          inArray(removedEmotes.id, overGuildCap)
        )
      )
      .returning({ id: removedEmotes.id });

    const orphans = await deleteOrphanedEmotes(tx);

    return { tasks, removedEmotes: removed.length, emotes: orphans };
  });

const runCleanup = async () => {
  try {
    const deleted = await deleteExpiredEmoteRecords();
    CoreConsole.info(
      `Retention cleanup: deleted ${deleted.tasks} editor task(s), ${deleted.removedEmotes} removed emote(s), ${deleted.emotes} emote row(s).`
    );
  } catch (error) {
    CoreConsole.error("Retention cleanup failed:", error);
  }
};

/**
 * Cleans up now and then periodically. Start it in one process only (the manager),
 * otherwise every shard would run the same queries. Does nothing if already started.
 */
export const startRetentionCleanup = (intervalMs = CLEANUP_INTERVAL) => {
  if (cleanupTimer) return;

  void runCleanup();

  cleanupTimer = setInterval(() => void runCleanup(), intervalMs);
  cleanupTimer.unref();
};
