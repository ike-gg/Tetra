import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { encryptToken } from "@/lib/crypto/token-crypto";
import { discordOauth } from "@/lib/discord-oauth";

import { db } from "../../../db";
import { sessions, users } from "../../../db/schema";
import { env } from "../../../env";
import type { AppEnv } from "../../api-env";
import { API_CONSTANTS } from "../../constants/api-constants";
import {
  type AuthCallbackError,
  DEFAULT_RETURN_PATH,
  frontendUrl,
  sanitizeReturnPath,
} from "./auth.shared";

import { ApiConsole } from "#/loggers";

export const sessionSchema = z.object({
  session_token: z.string(),
  user_discord_id: z.string(),
});

export type SessionSchema = z.infer<typeof sessionSchema>;

const isValidOauthState = (expected: unknown, state: string | undefined) => {
  if (typeof expected !== "string" || expected.length !== 64) return false;
  if (state?.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(state));
};

// Every field is optional: Discord sends `error` without `code` when the user cancels
const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

const redirectUri = `${env.BACKEND_URL}${API_CONSTANTS.RELATIVE_REDIRECT_URI}`;

export const authRouter = new Hono<AppEnv>()
  .get("/", (c) => {
    const state = randomBytes(32).toString("hex");
    const session = c.get("session");
    const { oauth_redirect: _, ...data } = session.data;
    const returnPath = sanitizeReturnPath(c.req.query("redirect"));

    // Kept next to an existing session, so an abandoned login does not log the user out
    session.set({
      ...data,
      oauth_state: state,
      ...(returnPath && { oauth_redirect: returnPath }),
    });

    const authUrl = discordOauth.generateAuthUrl({
      scope: API_CONSTANTS.DISCORD_SCOPES,
      redirectUri,
      state,
    });

    return c.redirect(authUrl);
  })
  .post("/logout", async (c) => {
    const session = c.get("session");
    const parsed = sessionSchema.safeParse(session.data);

    if (parsed.success) {
      await db
        .delete(sessions)
        .where(eq(sessions.session_token, parsed.data.session_token));
    }

    session.clear();
    return c.body(null, 204);
  })
  // Never answers with JSON: every outcome redirects the browser back to the panel
  .get("/callback", async (c) => {
    const session = c.get("session");
    const { oauth_state, oauth_redirect, ...rest } = session.data;
    const returnPath = sanitizeReturnPath(oauth_redirect) ?? DEFAULT_RETURN_PATH;

    // The pending login is single use, whatever the outcome; an existing session stays
    if (oauth_state !== undefined || oauth_redirect !== undefined) {
      if (Object.keys(rest).length > 0) session.set(rest);
      else session.clear();
    }

    const fail = (error: AuthCallbackError) => c.redirect(frontendUrl(returnPath, error));

    const query = callbackQuerySchema.safeParse(c.req.query());
    if (!query.success) return fail("AUTH_CALLBACK_ERROR");

    const { code, state, error } = query.data;

    // Checked before the state: a cancel grants nothing, and a stale tab should still
    // read as "cancelled" rather than as a state error
    if (error) {
      if (error === "access_denied") return fail("ACCESS_DENIED");
      ApiConsole.dev.error("Discord OAuth callback error:", error.slice(0, 64));
      return fail("AUTH_CALLBACK_ERROR");
    }

    if (!isValidOauthState(oauth_state, state)) return fail("INVALID_OAUTH_STATE");
    if (!code) return fail("AUTH_CALLBACK_ERROR");

    try {
      const token = await discordOauth.tokenRequest({
        grantType: "authorization_code",
        scope: API_CONSTANTS.DISCORD_SCOPES,
        code,
        redirectUri,
      });

      const userData = await discordOauth.getUser(token.access_token);

      const tokenColumns = {
        access_token: encryptToken(token.access_token),
        refresh_token: encryptToken(token.refresh_token),
        token_expires_at: new Date(Date.now() + token.expires_in * 1000),
      };

      const existingUser = await db.query.users.findFirst({
        where: eq(users.discord_id, userData.id),
      });

      let userId: number;

      if (existingUser) {
        await db.update(users).set(tokenColumns).where(eq(users.id, existingUser.id));
        userId = existingUser.id;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({ discord_id: userData.id, ...tokenColumns })
          .returning();
        userId = newUser.id;
      }

      const sessionToken = randomBytes(32).toString("hex");
      await db.insert(sessions).values({ user_id: userId, session_token: sessionToken });

      session.set({
        session_token: sessionToken,
        user_discord_id: userData.id,
      } satisfies SessionSchema);
    } catch (error) {
      // First line of the message only: the OAuth client's errors carry request data and
      // Drizzle appends the query params (encrypted tokens) on the following lines
      ApiConsole.error(
        "OAuth callback failed:",
        error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : "unknown"
      );
      return fail("AUTH_CALLBACK_ERROR");
    }

    return c.redirect(frontendUrl(returnPath));
  });
