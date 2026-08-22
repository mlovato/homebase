/**
 * @jest-environment node
 */
import { searchIcons, clearCache, METADATA_URL } from "./handler";
import { DASHBOARD_ICONS_CDN as CDN_BASE } from "@/lib/constants";
import { FETCH_TIMEOUT_MS } from "@/lib/fetchTimeout";

const MOCK_METADATA = {
  plex: { base: "svg", aliases: ["plex media server"], categories: ["Media"] },
  sonarr: { base: "svg", aliases: [], categories: ["Media"] },
  calibre: { base: "svg", aliases: ["calibre library"], categories: ["Books"] },
};

function mockFetch(data: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  clearCache();
});

describe("searchIcons", () => {
  it("returns empty array for queries shorter than 2 characters", async () => {
    const results = await searchIcons("p", mockFetch(MOCK_METADATA));
    expect(results).toEqual([]);
  });

  it("matches by slug", async () => {
    const results = await searchIcons("pl", mockFetch(MOCK_METADATA));
    expect(results.map((r) => r.slug)).toContain("plex");
  });

  it("matches by alias", async () => {
    const results = await searchIcons(
      "calibre library",
      mockFetch(MOCK_METADATA),
    );
    expect(results.map((r) => r.slug)).toContain("calibre");
  });

  it("returns slug, name, and CDN url for each result", async () => {
    const results = await searchIcons("sonarr", mockFetch(MOCK_METADATA));
    expect(results[0]).toEqual({
      slug: "sonarr",
      name: "Sonarr",
      url: `${CDN_BASE}/sonarr.svg`,
    });
  });

  it("derives human-readable name from kebab-case slug", async () => {
    const meta = { "nextcloud-calendar": { aliases: [] } };
    const results = await searchIcons("nextcloud", mockFetch(meta));
    expect(results[0].name).toBe("Nextcloud Calendar");
  });

  it("returns at most 8 results", async () => {
    const bigMetadata: Record<string, { aliases: string[] }> = {};
    for (let i = 0; i < 20; i++) bigMetadata[`service${i}`] = { aliases: [] };
    const results = await searchIcons("service", mockFetch(bigMetadata));
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it("returns empty array for no match", async () => {
    const results = await searchIcons("zzznomatch", mockFetch(MOCK_METADATA));
    expect(results).toEqual([]);
  });

  it("fetches metadata from the correct URL", async () => {
    const fetchFn = mockFetch(MOCK_METADATA);
    await searchIcons("plex", fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(METADATA_URL, expect.anything());
  });

  it("uses cached metadata on subsequent calls", async () => {
    const fetchFn = mockFetch(MOCK_METADATA);
    await searchIcons("plex", fetchFn);
    await searchIcons("sonarr", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("ranks exact slug match first, then starts-with, then contains", async () => {
    const meta = {
      tautulli: { aliases: ["plex monitor"] },
      "plex-alt": { aliases: [] },
      plexdrive: { aliases: [] },
      plex: { aliases: ["plex media server"] },
      perplexity: { aliases: [] },
    };
    const results = await searchIcons("plex", mockFetch(meta));
    expect(results[0].slug).toBe("plex");
    expect(results[1].slug).toBe("plex-alt");
    expect(results[2].slug).toBe("plexdrive");
  });

  it("returns empty array when metadata fetch fails", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as unknown as typeof fetch;
    const results = await searchIcons("plex", fetchFn);
    expect(results).toEqual([]);
  });

  it("does not cache a failed metadata response", async () => {
    const failFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as unknown as typeof fetch;
    await searchIcons("plex", failFetch);

    const successFetch = mockFetch(MOCK_METADATA);
    const results = await searchIcons("plex", successFetch);
    expect(results.map((r) => r.slug)).toContain("plex");
  });
});

describe("metadata cache lifetime", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  afterEach(() => jest.useRealTimers());

  it("refreshes after the TTL rather than caching for the process lifetime", async () => {
    jest.useFakeTimers();
    const fetchFn = mockFetch(MOCK_METADATA);

    await searchIcons("plex", fetchFn);
    await searchIcons("plex", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(DAY_MS + 1);
    await searchIcons("plex", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  // Serving the stale list without moving the expiry meant every later request
  // re-downloaded the (1 MB) metadata file while upstream was unhealthy.
  it("backs off instead of refetching on every request after a failed refresh", async () => {
    jest.useFakeTimers();
    await searchIcons("plex", mockFetch(MOCK_METADATA));

    jest.advanceTimersByTime(DAY_MS + 1);
    const failing = jest
      .fn()
      .mockResolvedValue({ ok: false } as Response) as unknown as typeof fetch;

    const first = await searchIcons("plex", failing);
    const second = await searchIcons("plex", failing);

    expect(failing).toHaveBeenCalledTimes(1);
    // and the previously loaded entries are still served
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  // A timeout or connection reset is the common way a refresh fails, and it
  // arrives as a rejection rather than a non-ok response. Letting it propagate
  // turned every icon search into a 500 while a usable cache sat in memory.
  it.each([
    ["a rejected fetch", () => Promise.reject(new Error("ECONNRESET"))],
    [
      "an unparsable body",
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
    ],
  ])("serves the cached list after %s", async (_label, impl) => {
    jest.useFakeTimers();
    await searchIcons("plex", mockFetch(MOCK_METADATA));

    jest.advanceTimersByTime(DAY_MS + 1);
    const failing = jest.fn(impl) as unknown as typeof fetch;

    const first = await searchIcons("plex", failing);
    expect(first.map((r) => r.slug)).toContain("plex");

    // and it backs off rather than retrying upstream on every keystroke
    const second = await searchIcons("plex", failing);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  // The timeout only ever covered getting the response headers, so a host that
  // answered and then stalled left the search request open indefinitely.
  it("gives up on metadata whose body never arrives", async () => {
    jest.useFakeTimers();
    let aborted = false;
    const stalling = jest.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: () =>
        new Promise((_, reject) => {
          init!.signal!.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
    })) as unknown as typeof fetch;

    const settled = searchIcons("plex", stalling).catch(
      (error: Error) => error.message,
    );
    await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);

    expect(aborted).toBe(true);
    await expect(settled).resolves.toBe("aborted");
    jest.useRealTimers();
  });

  it("still reports failure when a rejected fetch has no cache to fall back on", async () => {
    const failing = jest
      .fn()
      .mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;
    await expect(searchIcons("plex", failing)).rejects.toThrow("ECONNRESET");
  });

  it("does not let an empty response replace a good cache", async () => {
    jest.useFakeTimers();
    await searchIcons("plex", mockFetch(MOCK_METADATA));

    jest.advanceTimersByTime(DAY_MS + 1);
    const results = await searchIcons("plex", mockFetch({}));

    expect(results.length).toBeGreaterThan(0);
  });
});

// docs/manual-testing-plan.md §10 asks for "gthb" to find "github"; a plain
// substring test returned nothing for any abbreviation or dropped vowel.
describe("fuzzy matching", () => {
  const meta = {
    github: { aliases: [] },
    "home-assistant": { aliases: [] },
    plex: { aliases: [] },
  };

  it.each([
    ["gthb", "github"],
    ["hmasst", "home-assistant"],
  ])("finds %s", async (query, slug) => {
    const results = await searchIcons(query, mockFetch(meta));
    expect(results.map((r) => r.slug)).toContain(slug);
  });

  it("still ranks a literal match above a subsequence one", async () => {
    const results = await searchIcons("plex", mockFetch(meta));
    expect(results[0].slug).toBe("plex");
  });

  it("does not match letters that appear out of order", async () => {
    const results = await searchIcons("xelp", mockFetch(meta));
    expect(results).toEqual([]);
  });
});
