import { Router } from "express";
import getTask from "./getTask";

const taskRouter = Router();

taskRouter.get("/:id", getTask);

export default taskRouter;
