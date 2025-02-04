import { NextFunction, Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import tasksRouter from "./tasks/tasksRouter";
import { TetraAPIError } from "./TetraAPIError";
import { DiscordAPIError } from "discord.js";
import { discordOauth } from "..";
import { authRouter } from "./routes/auth/authRouter";
import { meRouter } from "./routes/me/me-router";
import { randomBytes } from "crypto";
import { ApiConsole } from "./utils/api-console";
import { guildsRouter } from "./routes/guilds/guilds-router";
import { checkUserAuth } from "./middleware/auth";

export const router = Router();

// -- UNPROTECTED ROUTES --

router.use("/auth", authRouter);

// /me includes protected routes, check meRouter structure
router.use("/me", meRouter);

// -- PROTECTED ROUTES --
router.use((req, res, next) => checkUserAuth(req, res, next, { fetchUserData: true }));

router.use("/guilds", guildsRouter);

router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof TetraAPIError) {
    res.status(error.code).json({
      error: error.message,
      reference: error.reference,
    });
    return;
  }

  if (error instanceof DiscordAPIError) {
    res.status(409).json({
      error: `Discord Error: ${error.message}`,
    });
    return;
  }

  const ref = randomBytes(8).toString("hex");
  ApiConsole.error(`[${ref}]`, error);

  res.status(500).json({
    error: "Internal Server Error",
    reference: ref,
  });

  return;
});

// export default router;
