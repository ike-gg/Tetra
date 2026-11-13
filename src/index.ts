import { ShardingManager } from "discord.js";
import DiscordOauth2 from "discord-oauth2";

import { startContinuityCleanup } from "@/interactions/continuity/cleanup-continuity";

import { initApi } from "./api";
import { env, isProduction } from "./env";

import { TempFileManager } from "#/files/temp-file-manager";
import { BotConsole, CoreConsole } from "#/loggers";

if (isProduction) {
  CoreConsole.warn("Running in production mode.");
  TempFileManager.cleanup();
} else CoreConsole.info("Running in development mode.");

startContinuityCleanup();

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

// Shards are child processes: if the manager dies without killing them they stay logged in.
// `bun --watch` restarts the manager in place without running these hooks; shards then
// exit on their own when their IPC channel closes (see exitWhenManagerIsGone).
const killShards = () => {
  // A killed shard must not be respawned while shutting down
  shardingManager.respawn = false;

  for (const shard of shardingManager.shards.values()) {
    if (shard.process) shard.kill();
  }
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    killShards();
    process.exit(0);
  });
}

process.on("exit", killShards);

shardingManager.on("shardCreate", (shard) => {
  BotConsole.success(`Launched shard ${shard.id}`);
});

shardingManager.spawn().catch((error) => {
  CoreConsole.error("Failed to spawn shards:", error);
  process.exit(1);
});

export { discordOauth, shardingManager };
