import { Router } from "express";
import taskRouter from "./tasks/taskRouter";
import bufferRouter from "./buffer/bufferRouter";
import authRouter from "./auth/authRouter";

const apiRouter = Router();

apiRouter.use("/task", taskRouter);
apiRouter.use("/buffer", bufferRouter);
apiRouter.use("/auth", authRouter);

export default apiRouter;
