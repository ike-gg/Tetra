import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { tasksDeleteTask } from "./tasks.delete-task";
import { tasksGetTask } from "./tasks.get-task";
import { tasksGetTaskFile } from "./tasks.get-task-file";
import { tasksGetTasks } from "./tasks.get-tasks";
import { tasksPostTask } from "./tasks.post-task";

export const tasksRouter = new Hono<AppEnv>()
  .get("/", ...tasksGetTasks)
  .get("/:taskId", ...tasksGetTask)
  .get("/:taskId/file", ...tasksGetTaskFile)
  .delete("/:taskId", ...tasksDeleteTask)
  .post("/:taskId", ...tasksPostTask);
