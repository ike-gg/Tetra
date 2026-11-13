import { Router } from "express";

import { tasksDeleteTask } from "./tasks.delete-task";
import { tasksGetTask } from "./tasks.get-task";
import { tasksGetTasks } from "./tasks.get-tasks";
import { tasksPostTask } from "./tasks.post-task";

export const tasksRouter = Router();

tasksRouter.get("/", tasksGetTasks);
tasksRouter.get("/:taskId", tasksGetTask);
tasksRouter.delete("/:taskId", tasksDeleteTask);
tasksRouter.post("/:taskId", tasksPostTask);
