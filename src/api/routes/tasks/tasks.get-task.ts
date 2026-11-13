import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { TetraAPIError } from "../../tetra-api-error";
import { findUserTask, taskParamsSchema, toApiEditorTask } from "./tasks.shared";

export const tasksGetTask = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { taskId } = taskParamsSchema.parse(req.params);

    const task = await findUserTask(taskId, req.user!.id);

    res.json(toApiEditorTask(task));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    }
    throw error;
  }
};
