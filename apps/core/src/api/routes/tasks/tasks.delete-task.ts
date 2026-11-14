import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { deleteUserTask, taskParamsSchema } from "./tasks.shared";

export const tasksDeleteTask = userFactory.createHandlers(
  requireUser,
  validate("param", taskParamsSchema),
  async (c) => {
    const { taskId } = c.req.valid("param");

    const deleted = await deleteUserTask(taskId, c.get("user").id);

    if (!deleted) {
      throw new TetraAPIError(404, "Task not found", "TASK_NOT_FOUND");
    }

    return c.body(null, 204);
  }
);
