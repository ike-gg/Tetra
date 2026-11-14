import { tmpdir } from "node:os";
import path from "node:path";
import chalk from "chalk";
import { Table } from "console-table-printer";
import dotenv from "dotenv";
import { z } from "zod";

import { CoreConsole } from "#/loggers";

dotenv.config();

const parseEncryptionKey = (value: string) => {
  const key = /^[0-9a-fA-F]{64}$/.test(value)
    ? Buffer.from(value, "hex")
    : /^[A-Za-z0-9+/]{43}=?$/.test(value)
      ? Buffer.from(value, "base64")
      : null;

  return key?.length === 32 ? key : null;
};

const parseOrigins = (value: string) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const url = new URL(origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      return url.origin;
    });

const envSchema = z.object({
  ENV: z
    .enum(["development", "production"])
    .default("development")
    .describe(
      "Environment of the application, it makes a difference in how the application behaves in certain situations."
    ),

  TEMP_DIR_PATH: z
    .string()
    .default(tmpdir())
    .transform((value) => {
      if (path.isAbsolute(value)) return value;

      try {
        const rootProjectDir = import.meta.dir?.split("/").slice(0, -1).join("/");
        const tempDir = path.join(rootProjectDir, value);

        return tempDir;
      } catch {
        CoreConsole.dev.warn(
          "Failed to resolve TEMP_DIR_PATH, using system temp directory. (Fallback for CJS modules)"
        );
        return tmpdir();
      }
    })
    .describe("Path to the temporary directory for storing temporary files"),

  DISCORD_BOT_ID: z.string().describe("Discord Bot ID"),
  DISCORD_BOT_TOKEN: z.string().describe("Discord Bot token"),

  DISCORD_OAUTH_CLIENT_ID: z.string().describe("Discord OAuth Client ID"),
  DISCORD_OAUTH_CLIENT_SECRET: z.string().describe("Discord OAuth Client Secret"),

  POSTGRES_URL: z
    .string()
    .url()
    .describe("URL Connection String for the postgresql database"),

  REDIS_URL: z.string().url().describe("URL Connection String for the redis database"),

  API_ENABLED: z
    .string()
    .default("false")
    .transform((val) => val === "true" || val === "1")
    .describe("Whether the API is enabled"),

  BACKEND_URL: z
    .string()
    .url()
    .describe("Public URL of the application that is used for example. OAuth2 redirects"),

  FRONTEND_URL: z.string().url().describe("Public URL of the frontend application"),

  SESSION_KEYS: z
    .string()
    .transform((val) => val.split(","))
    .describe("Comma separated list of keys for session"),

  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;

      try {
        return parseOrigins(value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be comma separated http(s) URLs",
        });
        return z.NEVER;
      }
    })
    .describe("Comma separated origins allowed by CORS, defaults to FRONTEND_URL"),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .transform((value, ctx) => {
      const key = parseEncryptionKey(value);

      if (!key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be 32 bytes as base64 or hex, e.g. `openssl rand -base64 32`",
        });
        return z.NEVER;
      }

      return key;
    })
    .describe(
      "Key (32 bytes, base64 or hex) that encrypts Discord tokens in the database"
    ),

  COOKIE_DOMAIN: z
    .string()
    .optional()
    .describe("Domain of the session cookie, e.g. .tetra.lol; host-only when not set"),

  PORT: z.string().default("3002").describe("Port for the API to listen on"),

  INVITE_LINK: z.string().url().describe("Discord Bot invite link"),

  DEV_GUILDS: z
    .string()
    .transform((val) => val.split(","))
    .optional()
    .describe(
      `Used for development purposes, comma separated list of guild IDs, see ${chalk.underline("src/deploy-commands-dev.ts")}`
    ),

  ERROR_LOG_CHANNEL_ID: z
    .string()
    .optional()
    .describe(
      "ID of the Discord channel that receives error logs sent with the 'Send developers log' button; the button is unavailable when not set"
    ),

  COBALT_URL: z
    .string()
    .url()
    .optional()
    .describe("URL of Cobalt API instance, media command depends on it"),
  COBALT_API_KEY: z
    .string()
    .optional()
    .describe("API key for Cobalt API, if its protected"),

  TWITCH_CLIENT_ID: z.string().describe("Twitch Client ID"),
  TWITCH_SECRET_KEY: z.string().describe("Twitch Secret Key"),

  TENOR_API_KEY: z.string().describe("Tenor API Key"),

  IMGUR_CLIENT_ID: z.string().describe("Imgur Client ID"),
});

// Compose passes unset optional vars as empty strings (`${VAR:-}`); treat them as unset
const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== "")
);

const { data, error } = envSchema.safeParse(definedEnv);

if (error) {
  const table = new Table({
    columns: [
      {
        name: "variable",
        color: "red",
        title: "Variable",
      },
      {
        name: "received",
        title: "Received",
      },
      {
        name: "message",
        title: "Message",
      },
      {
        name: "usage",
        maxLen: 20,
        alignment: "left",
        color: "black",
        title: "Usage",
      },
    ],
  });

  error.errors.forEach((err) => {
    const { path, received, message } = err as {
      path: string[];
      received: string;
      expected: string;
      message: string;
    };

    const key = path.at(0)!;
    const usage = envSchema.shape[key as keyof typeof envSchema.shape].description ?? "-";

    table.addRow({
      variable: key,
      received: received,
      message: message,
      usage: usage,
    });
  });

  table.printTable();

  CoreConsole.error("Failed to parse environment variables.");
  process.exit(1);
}

export const env = {
  ...data!,
  CORS_ORIGINS: data!.CORS_ORIGINS ?? [new URL(data!.FRONTEND_URL).origin],
};

export const isDevelopment = env.ENV === "development";
export const isProduction = env.ENV === "production";
