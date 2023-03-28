import { Router } from "express";
import getTask from "./getTask";
import postTask from "./postTask";

const taskRouter = Router();

taskRouter.get("/:id", getTask);
taskRouter.post("/", postTask);

export default taskRouter;
