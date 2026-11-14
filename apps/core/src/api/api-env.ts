import type { Server } from "bun";
import type OAuth from "discord-oauth2";
import { createFactory } from "hono/factory";

import type { CookieSession } from "./middleware/session";

export type AppEnv = {
  Bindings: { server: Server };
  Variables: { session: CookieSession };
};

/** After `requireAuth()`: the user's decrypted Discord access token. */
export type AuthEnv = AppEnv & {
  Variables: AppEnv["Variables"] & { accessToken: string };
};

/** After `requireAuth({ fetchUserData: true })`: also the user's Discord profile. */
export type UserEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & { user: OAuth.User };
};

export const appFactory = createFactory<AppEnv>();
export const authFactory = createFactory<AuthEnv>();
export const userFactory = createFactory<UserEnv>();
