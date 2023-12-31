import { z } from "zod";

import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  node_env: z.enum(["development", "production"]).default("development"),

  discordBotToken: z.string(),
  discordBotId: z.string(),

  oauthClientId: z.string(),
  oauthClientSecret: z.string(),

  inviteLink: z.string().url(),

  twitchClientId: z.string(),
  twitchSecretKey: z.string(),

  secretPhrase: z.string(),

  tenorApiKey: z.string(),

  imgurClientId: z.string(),

  DATABASE_URL: z.string().url(),

  PORT: z.number().default(3002),
});

export const env = envSchema.parse(process.env);