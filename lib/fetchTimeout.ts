export const FETCH_TIMEOUT_MS = 5000;

/**
 * Runs a fetch bounded by a timeout, always clearing the timer.
 *
 * Without this an unresponsive host (one that accepts the connection but never
 * answers) holds the request open for undici's 300s default, so the browser's
 * per-origin connection budget fills up with stalled probes and the rest of the
 * dashboard stops loading behind them.
 */
export async function withFetchTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
