import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { RETENTION, retentionCutoff, retentionExpiresAt } from "@/constants/retention";
import { db } from "@/db";
import { editorTasks } from "@/db/schema";
import { deleteEditorTasks } from "@/lib/retention/emote-records";

import { TetraAPIError } from "../../tetra-api-error";

export const taskParamsSchema = z.object({
  taskId: z.string().min(1).max(32),
});

/** Expired tasks are hidden before the cleanup deletes them. */
export const notExpiredTask = () =>
  gte(editorTasks.createdAt, retentionCutoff(RETENTION.EDITOR_TASK_MAX_AGE));

/**
 * Returns the task only if it belongs to the user and hasn't expired, otherwise throws
 * 404 TASK_NOT_FOUND.
 */
export const findUserTask = async (taskId: string, userId: string) => {
  const task = await db.query.editorTasks.findFirst({
    where: and(
      eq(editorTasks.id, taskId),
      eq(editorTasks.userId, userId),
      notExpiredTask()
    ),
    with: { emote: true },
  });

  if (!task?.emote) {
    throw new TetraAPIError(404, "Task not found", "TASK_NOT_FOUND");
  }

  return { ...task, emote: task.emote };
};

type UserTask = Awaited<ReturnType<typeof findUserTask>>;

export const toApiEditorTask = (task: UserTask) => {
  const { id, guildId, userId, emoteId, emote, createdAt } = task;
  const expiresAt = retentionExpiresAt(createdAt, RETENTION.EDITOR_TASK_MAX_AGE);
  return { id, guildId, userId, emoteId, emote, createdAt, expiresAt };
};

/**
 * Deletes the user's task together with its `emotes` row, unless something else still
 * references that row. Returns false when the task does not exist, is not the user's or
 * has expired.
 */
export const deleteUserTask = (taskId: string, userId: string) =>
  db.transaction(
    async (tx) =>
      (await deleteEditorTasks(
        tx,
        and(eq(editorTasks.id, taskId), eq(editorTasks.userId, userId), notExpiredTask())
      )) > 0
  );
