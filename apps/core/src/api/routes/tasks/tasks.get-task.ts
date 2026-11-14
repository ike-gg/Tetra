import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { validate } from "../../validate";
import { findUserTask, taskParamsSchema, toApiEditorTask } from "./tasks.shared";

export const tasksGetTask = userFactory.createHandlers(
  requireUser,
  validate("param", taskParamsSchema),
  async (c) => {
    const { taskId } = c.req.valid("param");

    const task = await findUserTask(taskId, c.get("user").id);

    return c.json(toApiEditorTask(task), 200);
  }
);
