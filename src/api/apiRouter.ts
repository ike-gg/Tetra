import { Router } from "express";
import taskRouter from "./tasks/taskRouter";

const apiRouter = Router();

apiRouter.use("/task", taskRouter);

export default apiRouter;
