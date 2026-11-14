import type { Server } from "bun";
import type OAuth from "discord-oauth2";
import { createFactory } from "hono/factory";

import type { CookieSession } from "./middleware/session";

export type AppEnv = {
  Bindings: { server: Server };
  Variables: { session: CookieSession };
};

/**
 * After `requireAuth()`: the user's decrypted Discord access token and Discord id (from
 * the database, not from the cookie, which is unsigned).
 */
export type AuthEnv = AppEnv & {
  Variables: AppEnv["Variables"] & { accessToken: string; discordUserId: string };
};

/** After `requireAuth({ fetchUserData: true })`: also the user's Discord profile. */
export type UserEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & { user: OAuth.User };
};

export const appFactory = createFactory<AppEnv>();
export const authFactory = createFactory<AuthEnv>();
export const userFactory = createFactory<UserEnv>();
