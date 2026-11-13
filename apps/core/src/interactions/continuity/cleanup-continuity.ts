import { isNull, lt, or } from "drizzle-orm";

import { TIME } from "@/constants/time";
import { db } from "@/db";
import { continuity } from "@/db/schema";

import { CoreConsole } from "#/loggers";

// Buttons need their row for ~6 h at most (the longest-lived state is 6 h), so 24 h is safe.
const MAX_AGE = TIME.DAY;
const CLEANUP_INTERVAL = TIME.HOUR;

let cleanupTimer: ReturnType<typeof setInterval> | undefined;

/** Deletes continuity rows older than `maxAgeMs`. Rows without a date count as old. */
export const deleteExpiredContinuity = async (maxAgeMs = MAX_AGE) => {
  const cutoff = new Date(Date.now() - maxAgeMs);

  const deleted = await db
    .delete(continuity)
    .where(or(isNull(continuity.createdAt), lt(continuity.createdAt, cutoff)))
    .returning({ id: continuity.id });

  return deleted.length;
};

const runCleanup = async (maxAgeMs: number) => {
  try {
    const count = await deleteExpiredContinuity(maxAgeMs);
    CoreConsole.info(`Continuity cleanup: deleted ${count} expired row(s).`);
  } catch (error) {
    CoreConsole.error("Continuity cleanup failed:", error);
  }
};

/**
 * Cleans up now and then periodically. Start it in one process only (the manager),
 * otherwise every shard would run the same query. Does nothing if already started.
 */
export const startContinuityCleanup = (
  intervalMs = CLEANUP_INTERVAL,
  maxAgeMs = MAX_AGE
) => {
  if (cleanupTimer) return;

  void runCleanup(maxAgeMs);

  cleanupTimer = setInterval(() => void runCleanup(maxAgeMs), intervalMs);
  cleanupTimer.unref();
};
