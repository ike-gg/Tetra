import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notExists,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";

import { RETENTION } from "@/constants/retention";
import { TIME } from "@/constants/time";
import type { db } from "@/db";
import { editorTasks, emotes, removedEmotes } from "@/db/schema";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | DbTransaction;

// The global sweep skips fresh rows: some writers insert the `emotes` row before the row
// that references it, outside a transaction.
const ORPHAN_SWEEP_GRACE = TIME.HOUR;

/**
 * Deletes `emotes` rows that no removed emote and no editor task references. With
 * `emoteIds` only those rows are checked; without, every row older than an hour.
 */
export const deleteOrphanedEmotes = async (executor: DbExecutor, emoteIds?: number[]) => {
  if (emoteIds?.length === 0) return 0;

  const scope = emoteIds
    ? inArray(emotes.id, emoteIds)
    : or(
        isNull(emotes.createdAt),
        lt(emotes.createdAt, new Date(Date.now() - ORPHAN_SWEEP_GRACE))
      );

  const deleted = await executor
    .delete(emotes)
    .where(
      and(
        scope,
        notExists(
          executor
            .select({ id: removedEmotes.id })
            .from(removedEmotes)
            .where(eq(removedEmotes.emoteId, emotes.id))
        ),
        notExists(
          executor
            .select({ id: editorTasks.id })
            .from(editorTasks)
            .where(eq(editorTasks.emoteId, emotes.id))
        )
      )
    )
    .returning({ id: emotes.id });

  return deleted.length;
};

/** Deletes the matching editor tasks and the `emotes` rows they leave unreferenced. */
export const deleteEditorTasks = async (tx: DbTransaction, where: SQL | undefined) => {
  const deleted = await tx
    .delete(editorTasks)
    .where(where)
    .returning({ emoteId: editorTasks.emoteId });

  await deleteOrphanedEmotes(tx, [...new Set(deleted.map(({ emoteId }) => emoteId))]);

  return deleted.length;
};

/** Keeps only the user's newest `EDITOR_TASKS_PER_USER` tasks. */
export const trimUserEditorTasks = (tx: DbTransaction, userId: string) =>
  deleteEditorTasks(
    tx,
    and(
      eq(editorTasks.userId, userId),
      notInArray(
        editorTasks.id,
        tx
          .select({ id: editorTasks.id })
          .from(editorTasks)
          .where(eq(editorTasks.userId, userId))
          .orderBy(desc(editorTasks.createdAt), desc(editorTasks.id))
          .limit(RETENTION.EDITOR_TASKS_PER_USER)
      )
    )
  );
