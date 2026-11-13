import { lt } from "drizzle-orm";

import { TIME } from "@/constants/time";
import { db } from "@/db";
import { sessions } from "@/db/schema";

import { SESSION_MAX_IDLE } from "./constants/api-constants";

import { ApiConsole } from "#/loggers";

const CLEANUP_INTERVAL = TIME.HOUR;

let cleanupTimer: ReturnType<typeof setInterval> | undefined;

/** Deletes sessions unused for longer than `maxIdleMs`. */
export const deleteExpiredSessions = async (maxIdleMs = SESSION_MAX_IDLE) => {
  const cutoff = new Date(Date.now() - maxIdleMs);

  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.last_used_at, cutoff))
    .returning({ id: sessions.id });

  return deleted.length;
};

const runCleanup = async (maxIdleMs: number) => {
  try {
    const count = await deleteExpiredSessions(maxIdleMs);
    ApiConsole.info(`Session cleanup: deleted ${count} expired session(s).`);
  } catch (error) {
    ApiConsole.error("Session cleanup failed:", error);
  }
};

/** Cleans up now and then hourly; the API runs in the manager only. Does nothing if already started. */
export const startSessionCleanup = (
  intervalMs = CLEANUP_INTERVAL,
  maxIdleMs = SESSION_MAX_IDLE
) => {
  if (cleanupTimer) return;

  void runCleanup(maxIdleMs);

  cleanupTimer = setInterval(() => void runCleanup(maxIdleMs), intervalMs);
  cleanupTimer.unref();
};
