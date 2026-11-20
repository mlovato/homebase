export const FETCH_TIMEOUT_MS = 5000;

/**
 * Runs a fetch bounded by a timeout, always clearing the timer.
 *
 * Without this an unresponsive host (one that accepts the connection but never
 * answers) holds the request open for undici's 300s default, so the browser's
 * per-origin connection budget fills up with stalled probes and the rest of the
 * dashboard stops loading behind them.
 *
 * Everything the bound has to cover must happen inside `run`, reading the
 * response body included: the signal is aborted as soon as `run` settles, so a
 * body awaited afterwards is cut off. That abort also releases the socket of a
 * response `run` returned from without reading.
 */
export async function withFetchTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
