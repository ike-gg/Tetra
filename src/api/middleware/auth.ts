import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { isProduction } from "@/env";
import { discordOauth } from "@/index";
import { decryptToken, encryptToken } from "@/lib/crypto/token-crypto";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";
import {
  API_CONSTANTS,
  SESSION_MAX_IDLE,
  SESSION_TOUCH_INTERVAL,
} from "../constants/api-constants";
import { sessionSchema } from "../routes/auth/auth-router";
import { TetraAPIError } from "../tetra-api-error";

import { ApiConsole } from "#/loggers";

interface CheckAuthOptions {
  fetchUserData?: boolean;
}

const defaultCheckAuthOptions: Required<CheckAuthOptions> = {
  fetchUserData: false,
};

export const checkUserAuth = (options: CheckAuthOptions = {}) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { fetchUserData } = { ...defaultCheckAuthOptions, ...options };

    try {
      if (!req.session) {
        return next(new TetraAPIError(401, "Unauthorized", "NO_SESSION"));
      }

      const { session_token } = sessionSchema.parse(req.session);

      const currentSession = await db.query.sessions.findFirst({
        where: eq(sessions.session_token, session_token),
      });

      if (!currentSession) {
        req.session = undefined;
        return next(new TetraAPIError(401, "Unauthorized", "INVALID_SESSION"));
      }

      const idleMs = Date.now() - currentSession.last_used_at.getTime();

      if (idleMs > SESSION_MAX_IDLE) {
        await db.delete(sessions).where(eq(sessions.id, currentSession.id));
        req.session = null;
        return next(new TetraAPIError(401, "Session expired", "SESSION_EXPIRED"));
      }

      // Sliding expiry: a write at most once per interval instead of one per request
      if (idleMs > SESSION_TOUCH_INTERVAL) {
        await db
          .update(sessions)
          .set({ last_used_at: new Date() })
          .where(eq(sessions.id, currentSession.id));

        // cookie-session only re-sends the cookie (with a new expiry) when its content changes
        if (req.session) req.session.refreshed_at = Date.now();
      }

      let currentUser = await db.query.users.findFirst({
        where: eq(users.id, currentSession.user_id),
      });

      if (!currentUser) {
        req.session = undefined;
        await db.delete(sessions).where(eq(sessions.id, currentSession.id));
        return next(new TetraAPIError(401, "Unauthorized", "USER_NOT_FOUND"));
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
            refreshToken: decryptToken(currentUser.refresh_token),
          });

          const [newUser] = await db
            .update(users)
            .set({
              access_token: encryptToken(token.access_token),
              refresh_token: encryptToken(token.refresh_token),
              token_expires_at: new Date(Date.now() + token.expires_in * 1000),
            })
            .where(eq(users.id, currentUser.id))
            .returning();

          currentUser = newUser;
        } catch (error) {
          req.session = undefined;
          ApiConsole.dev.error("Failed to refresh token:", error);
          return next(new TetraAPIError(401, "Unauthorized", "TOKEN_REFRESH_FAILED"));
        }
      }

      let accessToken: string;

      try {
        accessToken = decryptToken(currentUser.access_token);
      } catch {
        // Stored with another key or damaged: the user has to log in again
        req.session = null;
        ApiConsole.error("Failed to decrypt the stored access token.");
        return next(new TetraAPIError(401, "Unauthorized", "INVALID_ACCESS_TOKEN"));
      }

      req.accessToken = accessToken;

      if (fetchUserData) {
        try {
          const userProfile = await discordOauth.getUser(accessToken);
          req.user = userProfile;
        } catch (error) {
          req.session = undefined;
          ApiConsole.dev.error("Failed to fetch user profile:", error);
          return next(new TetraAPIError(401, "Unauthorized", "INVALID_ACCESS_TOKEN"));
        }
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiConsole.dev.error("Invalid session schema:", error);
        if (isProduction) req.session = undefined;
        return next(new TetraAPIError(401, "Unauthorized", "INVALID_SESSION_SCHEMA"));
      }

      if (error instanceof TetraAPIError) {
        return next(error);
      }

      ApiConsole.error("Unexpected error in auth middleware:", error);
      return next(
        new TetraAPIError(500, "Internal Server Error", "AUTH_MIDDLEWARE_ERROR")
      );
    }
  };
};
