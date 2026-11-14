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
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";

import { ApiConsole } from "#/loggers";

export const sessionSchema = z.object({
  session_token: z.string(),
  user_discord_id: z.string(),
});

export type SessionSchema = z.infer<typeof sessionSchema>;

const oauthStateSchema = z.object({
  oauth_state: z.string().length(64),
});

const isValidOauthState = (session: unknown, state: string) => {
  const parsed = oauthStateSchema.safeParse(session);
  if (!parsed.success || parsed.data.oauth_state.length !== state.length) return false;
  return timingSafeEqual(Buffer.from(parsed.data.oauth_state), Buffer.from(state));
};

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

const redirectUri = `${env.BACKEND_URL}${API_CONSTANTS.RELATIVE_REDIRECT_URI}`;

export const authRouter = new Hono<AppEnv>()
  .get("/", (c) => {
    const state = randomBytes(32).toString("hex");
    const session = c.get("session");

    // Kept next to an existing session, so an abandoned login does not log the user out
    session.set({ ...session.data, oauth_state: state });

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
  .get("/callback", validate("query", callbackSchema), async (c) => {
    const { code, state } = c.req.valid("query");
    const session = c.get("session");

    if (!isValidOauthState(session.data, state)) {
      throw new TetraAPIError(400, "Invalid OAuth state", "INVALID_OAUTH_STATE");
    }

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
      ApiConsole.dev.error(error);
      throw new TetraAPIError(500, "Internal Server Error", "AUTH_CALLBACK_ERROR");
    }

    return c.redirect(`${env.FRONTEND_URL}/panel`);
  });
