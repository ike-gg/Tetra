import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { TetraAPIError } from "../../tetra-api-error";
import { deleteUserTask, taskParamsSchema } from "./tasks.shared";

export const tasksDeleteTask = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { taskId } = taskParamsSchema.parse(req.params);

    const deleted = await deleteUserTask(taskId, req.user!.id);

    if (!deleted) {
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
