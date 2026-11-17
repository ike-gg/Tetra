import { runMigrations } from "@/db/migrate";
import { startContinuityCleanup } from "@/interactions/continuity/cleanup-continuity";
import { shardingManager } from "@/lib/sharding-manager";
import { stvSync } from "@/stv-sync/sync-service";

import { initApi } from "./api";
import { env, isProduction } from "./env";

import { TempFileManager } from "#/files/temp-file-manager";
import { BotConsole, CoreConsole, StvSyncConsole } from "#/loggers";

// Manager only: shards never run migrations. A failed migration stops startup.
try {
  await runMigrations();
  CoreConsole.success("Database migrations applied.");
} catch (error) {
  CoreConsole.error("Database migration failed:", error);
  process.exit(1);
}

if (isProduction) {
  CoreConsole.warn("Running in production mode.");
  TempFileManager.cleanup();
} else CoreConsole.info("Running in development mode.");

startContinuityCleanup();

if (env.API_ENABLED) initApi();

// One EventAPI client for all shards; it talks to Discord over REST
stvSync.start().catch((error) => {
  StvSyncConsole.error(
    "failed to start:",
    error instanceof Error ? error.message : error
  );
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
