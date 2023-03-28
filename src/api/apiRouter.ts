import { Router } from "express";
import taskRouter from "./tasks/taskRouter";
import bufferRouter from "./buffer/bufferRouter";

const apiRouter = Router();

apiRouter.use("/task", taskRouter);
apiRouter.use("/buffer", bufferRouter);

export default apiRouter;
