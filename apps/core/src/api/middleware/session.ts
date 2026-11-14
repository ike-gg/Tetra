import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import { env, isProduction } from "@/env";

import type { AppEnv } from "../api-env";
import { SESSION_COOKIE_NAME, SESSION_MAX_IDLE } from "../constants/api-constants";

type SessionData = Record<string, unknown>;

// Same format as the `cookie-session` package used before (base64 JSON, unsigned),
// so cookies issued by the old API stay valid.
const decode = (value: string): SessionData => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SessionData)
      : {};
  } catch {
    return {};
  }
};

const encode = (data: SessionData) =>
  Buffer.from(JSON.stringify(data)).toString("base64");

export class CookieSession {
  #data: SessionData;
  #state: "unchanged" | "changed" | "cleared" = "unchanged";

  constructor(data: SessionData) {
    this.#data = data;
  }

  get data(): Readonly<SessionData> {
    return this.#data;
  }

  get state() {
    return this.#state;
  }

  /** Replaces the whole session. */
  set(data: SessionData) {
    this.#data = data;
    this.#state = "changed";
  }

  clear() {
    this.#data = {};
    this.#state = "cleared";
  }

  /** Re-sends the cookie with a fresh expiry without changing its content. */
  touch() {
    if (this.#state === "unchanged") this.#state = "changed";
  }
}

const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: isProduction,
  sameSite: "Lax",
  domain: env.COOKIE_DOMAIN,
} as const;

/**
 * Session stored in the `tetra-session` cookie. It only holds a random token checked
 * against the database, so it is not signed on purpose.
 */
export const session = createMiddleware<AppEnv>(async (c, next) => {
  const raw = getCookie(c, SESSION_COOKIE_NAME);
  const current = new CookieSession(raw ? decode(raw) : {});
  c.set("session", current);

  await next();

  if (current.state === "cleared") {
    if (raw) deleteCookie(c, SESSION_COOKIE_NAME, cookieOptions);
  } else if (current.state === "changed") {
    setCookie(c, SESSION_COOKIE_NAME, encode(current.data), {
      ...cookieOptions,
      // Sliding: the cookie is re-sent when the session is touched (see auth middleware)
      maxAge: Math.floor(SESSION_MAX_IDLE / 1000),
    });
  }
});
