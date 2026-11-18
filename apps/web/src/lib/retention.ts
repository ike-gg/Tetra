// Mirrors core's RETENTION (apps/core/src/constants/retention.ts); the API sends each
// item's `expiresAt`, these are only for copy
export const RETENTION_DAYS = 14;
export const TASK_LIMIT = 20;

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export type TimeLeft = {
  /** For a tile corner: `12d left`, `5h left`, `<1h left`. */
  short: string;
  /** For running text: `expires in 12 days`. */
  long: string;
  /** Under a day left. */
  soon: boolean;
};

export const timeLeft = (expiresAt: string, now = Date.now()): TimeLeft => {
  const left = Date.parse(expiresAt) - now;
  if (left >= DAY) {
    const days = Math.max(1, Math.round(left / DAY));
    return {
      short: `${days}d left`,
      long: `expires in ${days} ${days === 1 ? "day" : "days"}`,
      soon: false,
    };
  }
  if (left >= HOUR) {
    const hours = Math.floor(left / HOUR);
    return {
      short: `${hours}h left`,
      long: `expires in ${hours} ${hours === 1 ? "hour" : "hours"}`,
      soon: true,
    };
  }
  return { short: "<1h left", long: "expires in under an hour", soon: true };
};
