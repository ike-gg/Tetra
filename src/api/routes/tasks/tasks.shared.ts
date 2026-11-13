import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { editorTasks } from "@/db/schema";

import { TetraAPIError } from "../../tetra-api-error";

export const taskParamsSchema = z.object({
  taskId: z.string().min(1).max(32),
});

/** Returns the task only if it belongs to the user, otherwise throws 404 TASK_NOT_FOUND. */
export const findUserTask = async (taskId: string, userId: string) => {
  const task = await db.query.editorTasks.findFirst({
    where: and(eq(editorTasks.id, taskId), eq(editorTasks.userId, userId)),
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
  return { id, guildId, userId, emoteId, emote, createdAt };
};
