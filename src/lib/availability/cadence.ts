/** Expected worker poll interval. Keep vercel.json cron in sync (every 20 minutes). */
export const POLL_INTERVAL_SECONDS = 1200;
export const POLL_INTERVAL_MS = POLL_INTERVAL_SECONDS * 1000;
export const POLL_CADENCE = "20 minutes";
/** Gaps longer than 3× cadence render as unknown in history. */
export const HISTORY_GAP_THRESHOLD_SECONDS = POLL_INTERVAL_SECONDS * 3;
