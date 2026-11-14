import { TIME } from "@/constants/time";

export const API_CONSTANTS = {
  DISCORD_SCOPES: "identify guilds guilds.members.read",
  RELATIVE_REDIRECT_URI: "/api/auth/callback",
};

export const SESSION_COOKIE_NAME = "tetra-session";

export const EMOTE_NAME_REGEX = /^[a-zA-Z0-9_]{2,32}$/;

// A session unused for this long is deleted; every request inside the window extends it.
export const SESSION_MAX_IDLE = TIME.DAY * 30;

// `sessions.last_used_at` (and the cookie expiry) is refreshed at most this often
export const SESSION_TOUCH_INTERVAL = TIME.HOUR;
