import { TIME } from "./time";

/** How long editor tasks and removed emotes are kept. Enforced on read and by the hourly cleanup. */
export const RETENTION = {
  EDITOR_TASK_MAX_AGE: 14 * TIME.DAY,
  EDITOR_TASKS_PER_USER: 20,
  REMOVED_EMOTE_MAX_AGE: 14 * TIME.DAY,
  REMOVED_EMOTES_PER_GUILD: 250,
} as const;

/** Rows created before this date are expired. */
export const retentionCutoff = (maxAgeMs: number, now = Date.now()) =>
  new Date(now - maxAgeMs);

export const retentionExpiresAt = (createdAt: Date, maxAgeMs: number) =>
  new Date(createdAt.getTime() + maxAgeMs);
