import { NextFunction, Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import guildsRouter from "./guilds/guildsRouter";
import tasksRouter from "./tasks/tasksRouter";
import { TetraAPIError } from "./TetraAPIError";
import { DiscordAPIError } from "discord.js";

const apiRouter = Router();

apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} url:: ${req.url}`);
  const nextAuthSession = req.cookies["session"];

  if (!nextAuthSession) {
    res.status(401).json({
      error: "Unauthorized. missing auth",
    });
    return;
  }

  const prisma = new PrismaClient();

  const currentSession = await prisma.session.findFirst({
    where: {
      sessionToken: nextAuthSession,
    },
  });

  if (!currentSession) {
    await prisma.$disconnect();
    res.status(401).json({
      error: "Unauthorized. missing session",
    });
    return;
  }

  const currentAccount = await prisma.account.findFirst({
    where: {
      userId: currentSession.userId,
    },
  });

  if (!currentAccount || !currentAccount.access_token) {
    await prisma.$disconnect();
    res.status(401).json({
      error: "Unauthorized. missing acc or tkn",
    });
    return;
  }

  await prisma.$disconnect();
  res.locals.accessToken = currentAccount.access_token;

  next();
});

apiRouter.use("/guilds", guildsRouter);
apiRouter.use("/tasks", tasksRouter);

apiRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`error for: ${req.method} url:: ${req.url}`);
  console.error(String(err).slice(0, 256));

  if (err instanceof TetraAPIError) {
    res.status(err.code).json({
      error: err.message,
    });
    return;
  }

  if (err instanceof DiscordAPIError) {
    res.status(409).json({
      error: `Discord Error: ${err.message}`,
    });
    return;
  }

  let errorMessage = err instanceof Error ? err.message : String(err);
  if (errorMessage.length > 96) {
    errorMessage = errorMessage.slice(0, 96) + "...";
  }
  res.status(500).json({
    error: errorMessage,
  });
  return;
});

export default apiRouter;
