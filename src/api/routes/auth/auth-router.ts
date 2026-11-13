import { randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";

import { discordOauth } from "@/index";
import { encryptToken } from "@/lib/crypto/token-crypto";

import { db } from "../../../db";
import { sessions, users } from "../../../db/schema";
import { env } from "../../../env";
import { API_CONSTANTS } from "../../constants/api-constants";
import { TetraAPIError } from "../../tetra-api-error";

import { ApiConsole } from "#/loggers";

export const sessionSchema = z.object({
  session_token: z.string(),
  user_discord_id: z.string(),
});

export type SessionSchema = z.infer<typeof sessionSchema>;

export const authRouter = Router();

const oauthStateSchema = z.object({
  oauth_state: z.string().length(64),
});

const isValidOauthState = (session: unknown, state: string) => {
  const parsed = oauthStateSchema.safeParse(session);
  if (!parsed.success || parsed.data.oauth_state.length !== state.length) return false;
  return timingSafeEqual(Buffer.from(parsed.data.oauth_state), Buffer.from(state));
};

authRouter.get("/", (req: Request, res: Response, __: NextFunction) => {
  const state = randomBytes(32).toString("hex");

  // Kept next to an existing session, so an abandoned login does not log the user out
  req.session = { ...req.session, oauth_state: state };

  const authUrl = discordOauth.generateAuthUrl({
    scope: API_CONSTANTS.DISCORD_SCOPES,
    redirectUri: `${env.BACKEND_URL}${API_CONSTANTS.RELATIVE_REDIRECT_URI}`,
    state,
  });

  res.redirect(authUrl);
});

authRouter.post("/logout", async (req: Request, res: Response, _: NextFunction) => {
  const parsed = sessionSchema.safeParse(req.session);

  if (parsed.success) {
    await db
      .delete(sessions)
      .where(eq(sessions.session_token, parsed.data.session_token));
  }

  req.session = null;
  res.sendStatus(204);
});

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

authRouter.get("/callback", async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { code, state } = callbackSchema.parse(req.query);

    if (!isValidOauthState(req.session, state)) {
      throw new TetraAPIError(400, "Invalid OAuth state", "INVALID_OAUTH_STATE");
    }

    const token = await discordOauth.tokenRequest({
      grantType: "authorization_code",
      scope: API_CONSTANTS.DISCORD_SCOPES,
      code,
      redirectUri: `${env.BACKEND_URL}${API_CONSTANTS.RELATIVE_REDIRECT_URI}`,
    });

    const userData = await discordOauth.getUser(token.access_token);

    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.discord_id, userData.id),
    });

    let userId: number;

    if (existingUser) {
      await db
        .update(users)
        .set({
          access_token: encryptToken(token.access_token),
          refresh_token: encryptToken(token.refresh_token),
          token_expires_at: new Date(Date.now() + token.expires_in * 1000),
        })
        .where(eq(users.discord_id, userData.id));

      userId = existingUser.id;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          discord_id: userData.id,
          access_token: encryptToken(token.access_token),
          refresh_token: encryptToken(token.refresh_token),
          token_expires_at: new Date(Date.now() + token.expires_in * 1000),
        })
        .returning();
      userId = newUser.id;
    }

    const sessionToken = randomBytes(32).toString("hex");
    await db.insert(sessions).values({
      user_id: userId,
      session_token: sessionToken,
    });

    const session: SessionSchema = {
      session_token: sessionToken,
      user_discord_id: userData.id,
    };

    req.session = session;

    res.redirect(`${env.FRONTEND_URL}/panel`);
  } catch (error) {
    ApiConsole.dev.error(error);
    if (error instanceof TetraAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    } else {
      throw new TetraAPIError(500, "Internal Server Error", "AUTH_CALLBACK_ERROR");
    }
  }
});
