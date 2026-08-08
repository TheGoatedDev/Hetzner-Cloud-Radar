/** Expected worker poll interval. Keep Railway cron in sync (every 5 minutes). */
export const POLL_INTERVAL_SECONDS = 300;
export const POLL_INTERVAL_MS = POLL_INTERVAL_SECONDS * 1000;
export const POLL_CADENCE = "5 minutes";
/** Gaps longer than 3× cadence render as unknown in history. */
export const HISTORY_GAP_THRESHOLD_SECONDS = POLL_INTERVAL_SECONDS * 3;
