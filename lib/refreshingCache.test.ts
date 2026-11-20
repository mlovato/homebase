/**
 * @jest-environment node
 */
import { createRefreshingCache } from "./refreshingCache";

const REFRESH_AFTER_MS = 1000;

const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(load: (key: string) => Promise<string | null>, maxEntries = 10) {
  let clock = 0;
  jest.spyOn(Date, "now").mockImplementation(() => clock);
  const loader = jest.fn(load);
  const cache = createRefreshingCache({
    load: loader,
    refreshAfterMs: REFRESH_AFTER_MS,
    maxEntries,
  });
  return {
    cache,
    loader,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

afterEach(() => jest.restoreAllMocks());

describe("createRefreshingCache", () => {
  it("loads a key it has not seen", async () => {
    const { cache } = setup(async (key) => `value of ${key}`);
    await expect(cache.get("a")).resolves.toBe("value of a");
  });

  it("answers a recent entry without loading again", async () => {
    const { cache, loader } = setup(async () => "v1");
    await cache.get("a");
    await cache.get("a");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("answers an old entry at once and refreshes it in the background", async () => {
    let current = "v1";
    const { cache, loader, advance } = setup(async () => current);
    await cache.get("a");

    current = "v2";
    advance(REFRESH_AFTER_MS + 1);
    await expect(cache.get("a")).resolves.toBe("v1");
    await flush();

    expect(loader).toHaveBeenCalledTimes(2);
    await expect(cache.get("a")).resolves.toBe("v2");
  });

  // The whole point: a site that is slow or down on one load must not turn a
  // known-good icon back into a letter avatar.
  it.each([
    ["returns nothing", async () => null],
    [
      "throws",
      async () => {
        throw new Error("timeout");
      },
    ],
  ])("keeps the last good value when a refresh %s", async (_, failure) => {
    let load: () => Promise<string | null> = async () => "good";
    const { cache, advance } = setup(() => load());
    await cache.get("a");

    load = failure;
    advance(REFRESH_AFTER_MS + 1);
    await cache.get("a");
    await flush();

    await expect(cache.get("a")).resolves.toBe("good");
  });

  // Otherwise a site that is down is scraped again on every single read.
  it("waits a full refresh window before retrying a failed refresh", async () => {
    let load: () => Promise<string | null> = async () => "good";
    const { cache, loader, advance } = setup(() => load());
    await cache.get("a");

    load = async () => null;
    advance(REFRESH_AFTER_MS + 1);
    await cache.get("a");
    await flush();
    loader.mockClear();

    await cache.get("a");
    await flush();
    expect(loader).not.toHaveBeenCalled();

    advance(REFRESH_AFTER_MS + 1);
    await cache.get("a");
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not remember a failed first load", async () => {
    let result: string | null = null;
    const { cache } = setup(async () => result);
    await expect(cache.get("a")).resolves.toBeNull();

    result = "found";
    await expect(cache.get("a")).resolves.toBe("found");
  });

  it("treats a throwing first load as nothing found", async () => {
    const { cache } = setup(async () => {
      throw new Error("ENOTFOUND");
    });
    await expect(cache.get("a")).resolves.toBeNull();
  });

  it("shares one load between concurrent requests for the same key", async () => {
    const { cache, loader } = setup(async () => "v1");
    const results = await Promise.all([cache.get("a"), cache.get("a")]);
    expect(results).toEqual(["v1", "v1"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("starts only one background refresh however often an old entry is read", async () => {
    const { cache, loader, advance } = setup(async () => "v1");
    await cache.get("a");

    advance(REFRESH_AFTER_MS + 1);
    await Promise.all([cache.get("a"), cache.get("a"), cache.get("a")]);
    await flush();

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("evicts the least recently stored entry once it is full", async () => {
    const { cache, loader } = setup(async (key) => key, 2);
    await cache.get("a");
    await cache.get("b");
    await cache.get("c");
    loader.mockClear();

    await cache.get("b");
    await cache.get("c");
    expect(loader).not.toHaveBeenCalled();

    await cache.get("a");
    expect(loader).toHaveBeenCalledWith("a");
  });
});
