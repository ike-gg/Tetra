import { Response, NextFunction, Request } from "express";
import { sessionSchema } from "../routes/auth/authRouter";
import { z } from "zod";
import { TetraAPIError } from "../TetraAPIError";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { sessions, users } from "../../db/schema";
import { discordOauth } from "../..";
import { API_CONSTANTS } from "../constants/API_CONSTANTS";
import { ApiConsole } from "../utils/api-console";

interface CheckAuthOptions {
  fetchUserData?: boolean;
}

const defaultCheckAuthOptions: Required<CheckAuthOptions> = {
  fetchUserData: false,
};

export const checkUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
  options: CheckAuthOptions
) => {
  const { fetchUserData } = { ...defaultCheckAuthOptions, ...options };

  try {
    const { session_token } = sessionSchema.parse(req.session);

    const currentSession = await db.query.sessions.findFirst({
      where: eq(sessions.session_token, session_token),
    });

    if (!currentSession) {
      req.session = undefined;
      throw new TetraAPIError(401, "Unauthorized", "NO_SESSION_IN_DB");
    }

    let currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentSession.user_id),
    });

    if (!currentUser) {
      req.session = undefined;
      throw new TetraAPIError(401, "Unauthorized", "NO_USER_IN_DB");
    }

    if (currentUser.token_expires_at < new Date()) {
      try {
        ApiConsole.dev.info(
          "User token expired, refreshing token for:",
          currentUser.discord_id
        );

        const token = await discordOauth.tokenRequest({
          grantType: "refresh_token",
          scope: API_CONSTANTS.DISCORD_SCOPES,
          refreshToken: currentUser.refresh_token,
        });

        let [newUser] = await db
          .update(users)
          .set({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_expires_at: new Date(Date.now() + token.expires_in * 1000),
          })
          .where(eq(users.id, currentUser.id))
          .returning();

        currentUser = newUser;
      } catch {
        req.session = undefined;
        throw new TetraAPIError(401, "Unauthorized", "INVALID_REFRESH_TOKEN");
      }
    }

    if (fetchUserData) {
      try {
        const userProfile = await discordOauth.getUser(currentUser.access_token);
        req.user = userProfile;
      } catch {
        req.session = undefined;
        throw new TetraAPIError(401, "Unauthorized", "TOKEN_NOT_VALID");
      }
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      req.session = undefined;
      throw new TetraAPIError(401, "Unauthorized", "INVALID_SESSION_SCHEMA");
    }
    if (error instanceof TetraAPIError) {
      throw error;
    } else {
      console.log(error);
      throw new TetraAPIError(500, "Internal Server Error", "INTERNAL_ERROR_AUTH_CHECK");
    }
  }
};
