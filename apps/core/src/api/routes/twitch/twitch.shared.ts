import { z } from "zod";

/** Twitch logins: letters, digits and underscores, at most 25 characters. */
export const twitchLoginSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_]{1,25}$/)
  .transform((login) => login.toLowerCase());

/** Helix user ids are numeric strings. */
export const twitchChannelIdSchema = z.string().regex(/^\d{1,20}$/);
