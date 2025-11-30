import DiscordOauth2 from "discord-oauth2";
import { ShardingManager } from "discord.js";

import { initApi } from "./api";
import { env, isProduction } from "./env";

import { TempFileManager } from "#/files/temp-file-manager";
import { BotConsole, CoreConsole } from "#/loggers";

if (isProduction) {
  CoreConsole.warn("Running in production mode.");
  TempFileManager.cleanup();
} else CoreConsole.info("Running in development mode.");

if (env.API_ENABLED) initApi();

const discordOauth = new DiscordOauth2({
  clientId: env.DISCORD_OAUTH_CLIENT_ID,
  clientSecret: env.DISCORD_OAUTH_CLIENT_SECRET,
  version: "v10",
});

const shardingManager = new ShardingManager("./src/bot.ts", {
  token: env.DISCORD_BOT_TOKEN,
  totalShards: "auto",
});

shardingManager.on("shardCreate", (shard) => {
  BotConsole.success(`Launched shard ${shard.id}`);
});

shardingManager.spawn();

export { discordOauth, shardingManager };
