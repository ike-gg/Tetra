import { Router } from "express";

import finishTask from "./finish-task";

const tasksRouter = Router();

tasksRouter.post("/:taskid", finishTask);

export default tasksRouter;
