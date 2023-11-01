import { NextFunction, Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import guildsRouter from "./guilds/guildsRouter";
import tasksRouter from "./tasks/tasksRouter";

const apiRouter = Router();

apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  console.log(`request`, req.path, req.method);
  const nextAuthSession = req.cookies["next-auth.session-token"];
  if (!nextAuthSession) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const prisma = new PrismaClient();

  const currentSession = await prisma.session.findFirst({
    where: { sessionToken: nextAuthSession },
  });

  if (!currentSession) {
    await prisma.$disconnect();
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const currentAccount = await prisma.account.findFirst({
    where: { userId: currentSession.userId },
  });

  if (!currentAccount || !currentAccount.access_token) {
    await prisma.$disconnect();
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  await prisma.$disconnect();
  res.locals.accessToken = currentAccount.access_token;

  next();
});

apiRouter.use("/guilds", guildsRouter);
apiRouter.use("/tasks", tasksRouter);

export default apiRouter;
