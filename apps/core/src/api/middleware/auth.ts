import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { isProduction } from "@/env";
import { decryptToken, encryptToken } from "@/lib/crypto/token-crypto";
import { discordOauth } from "@/lib/discord-oauth";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";
import type { AuthEnv, UserEnv } from "../api-env";
import {
  API_CONSTANTS,
  SESSION_MAX_IDLE,
  SESSION_TOUCH_INTERVAL,
} from "../constants/api-constants";
import { sessionSchema } from "../routes/auth/auth-router";
import { TetraAPIError } from "../tetra-api-error";
import type { CookieSession } from "./session";

import { ApiConsole } from "#/loggers";

const authenticate = async (session: CookieSession) => {
  // A cookie without a token (none at all, or only a pending OAuth state) is not logged in
  if (!("session_token" in session.data)) {
    throw new TetraAPIError(401, "Unauthorized", "NO_SESSION");
  }

  const parsed = sessionSchema.safeParse(session.data);

  if (!parsed.success) {
    ApiConsole.dev.error("Invalid session schema:", parsed.error);
    if (isProduction) session.clear();
    throw new TetraAPIError(401, "Unauthorized", "INVALID_SESSION_SCHEMA");
  }

  const currentSession = await db.query.sessions.findFirst({
    where: eq(sessions.session_token, parsed.data.session_token),
  });

  if (!currentSession) {
    session.clear();
    throw new TetraAPIError(401, "Unauthorized", "INVALID_SESSION");
  }

  const idleMs = Date.now() - currentSession.last_used_at.getTime();

  if (idleMs > SESSION_MAX_IDLE) {
    await db.delete(sessions).where(eq(sessions.id, currentSession.id));
    session.clear();
    throw new TetraAPIError(401, "Session expired", "SESSION_EXPIRED");
  }

  // Sliding expiry: a write at most once per interval instead of one per request
  if (idleMs > SESSION_TOUCH_INTERVAL) {
    await db
      .update(sessions)
      .set({ last_used_at: new Date() })
      .where(eq(sessions.id, currentSession.id));

    session.touch();
  }

  let currentUser = await db.query.users.findFirst({
    where: eq(users.id, currentSession.user_id),
  });

  if (!currentUser) {
    session.clear();
    await db.delete(sessions).where(eq(sessions.id, currentSession.id));
    throw new TetraAPIError(401, "Unauthorized", "USER_NOT_FOUND");
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
      session.clear();
      ApiConsole.dev.error("Failed to refresh token:", error);
      throw new TetraAPIError(401, "Unauthorized", "TOKEN_REFRESH_FAILED");
    }
  }

  try {
    return {
      accessToken: decryptToken(currentUser.access_token),
      discordUserId: currentUser.discord_id,
    };
  } catch {
    // Stored with another key or damaged: the user has to log in again
    session.clear();
    ApiConsole.error("Failed to decrypt the stored access token.");
    throw new TetraAPIError(401, "Unauthorized", "INVALID_ACCESS_TOKEN");
  }
};

const withAuthErrors = async <T>(run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TetraAPIError) throw error;
    ApiConsole.error("Unexpected error in auth middleware:", error);
    throw new TetraAPIError(500, "Internal Server Error", "AUTH_MIDDLEWARE_ERROR");
  }
};

/**
 * Requires a valid session; sets `accessToken` (decrypted, refreshed when expired) and
 * `discordUserId`.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = await withAuthErrors(() => authenticate(c.get("session")));
  c.set("accessToken", auth.accessToken);
  c.set("discordUserId", auth.discordUserId);
  await next();
});

/** `requireAuth` plus the user's Discord profile in `user`. */
export const requireUser = createMiddleware<UserEnv>(async (c, next) => {
  const { accessToken, discordUserId } = await withAuthErrors(() =>
    authenticate(c.get("session"))
  );
  c.set("accessToken", accessToken);
  c.set("discordUserId", discordUserId);

  try {
    c.set("user", await discordOauth.getUser(accessToken));
  } catch (error) {
    c.get("session").clear();
    ApiConsole.dev.error("Failed to fetch user profile:", error);
    throw new TetraAPIError(401, "Unauthorized", "INVALID_ACCESS_TOKEN");
  }

  await next();
});
