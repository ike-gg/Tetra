import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { db } from "@/db";
import { editorTasks } from "@/db/schema";

import { TetraAPIError } from "../../tetra-api-error";
import { taskParamsSchema } from "./tasks.shared";

export const tasksDeleteTask = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { taskId } = taskParamsSchema.parse(req.params);

    const deleted = await db
      .delete(editorTasks)
      .where(and(eq(editorTasks.id, taskId), eq(editorTasks.userId, req.user!.id)))
      .returning({ id: editorTasks.id });

    if (deleted.length === 0) {
      throw new TetraAPIError(404, "Task not found", "TASK_NOT_FOUND");
    }

    res.sendStatus(204);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    }
    throw error;
  }
};
