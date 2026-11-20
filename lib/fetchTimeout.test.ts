/**
 * @jest-environment node
 */
import { FETCH_TIMEOUT_MS, withFetchTimeout } from "./fetchTimeout";

describe("withFetchTimeout", () => {
  it("returns what the run resolves to", async () => {
    await expect(withFetchTimeout(async () => "done")).resolves.toBe("done");
  });

  // A response whose body is never read holds its socket open until garbage
  // collection. Aborting once the run is over releases it.
  it("aborts the signal once the run has settled", async () => {
    let signal!: AbortSignal;
    await withFetchTimeout(async (s) => {
      signal = s;
      expect(s.aborted).toBe(false);
    });
    expect(signal.aborted).toBe(true);
  });

  it("aborts the signal when the run takes longer than the timeout", async () => {
    jest.useFakeTimers();
    try {
      let abortedInRun = false;
      const settled = withFetchTimeout(
        (signal) =>
          new Promise<void>((resolve) =>
            signal.addEventListener("abort", () => {
              abortedInRun = true;
              resolve();
            }),
          ),
      );
      await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);
      await settled;
      expect(abortedInRun).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
