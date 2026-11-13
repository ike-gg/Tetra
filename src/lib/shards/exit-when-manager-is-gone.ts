import { isProduction } from "@/env";

import { BotConsole } from "#/loggers";

const WATCHDOG_INTERVAL = 5_000;
const FORCE_EXIT_AFTER = 5_000;

/**
 * Makes a shard process exit when its sharding manager is gone, so it cannot stay logged in
 * to Discord with old code. The 'disconnect' event is the main signal; the `connected`
 * check is a fallback in case the event was missed.
 *
 * `process.ppid` is not used: Bun does not update it when the parent dies, and
 * `bun --watch` restarts the manager in place under the same PID.
 *
 * Development only: `bun --watch` reloads leave orphaned shards behind, while in production
 * the manager and its shards run in one container and die together. Also does nothing
 * without a manager (no IPC channel), so a standalone shard keeps working.
 */
export const exitWhenManagerIsGone = (cleanup: () => Promise<unknown>) => {
  if (isProduction || !process.send) return;

  let exiting = false;

  const shutdown = async (reason: string) => {
    if (exiting) return;
    exiting = true;

    // A hanging cleanup must never keep an orphan alive
    setTimeout(() => process.exit(0), FORCE_EXIT_AFTER).unref();

    try {
      BotConsole.warn(`Sharding manager is gone (${reason}), shutting down shard.`);
      await cleanup();
    } catch (error) {
      BotConsole.error("Shard cleanup failed:", error);
    } finally {
      process.exit(0);
    }
  };

  process.on("disconnect", () => void shutdown("IPC channel disconnected"));

  setInterval(() => {
    if (!process.connected) void shutdown("IPC channel closed");
  }, WATCHDOG_INTERVAL).unref();
};
