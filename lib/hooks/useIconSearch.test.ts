import { renderHook, act, waitFor } from "@testing-library/react";
import { useIconSearch } from "./useIconSearch";

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function mockFetchResults(results: unknown[]) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  });
}

describe("useIconSearch", () => {
  it("returns empty suggestions initially", () => {
    const { result } = renderHook(() => useIconSearch(""));
    expect(result.current.suggestions).toEqual([]);
  });

  it("does not fetch for queries shorter than 2 characters", async () => {
    renderHook(() => useIconSearch("p"));
    act(() => jest.runAllTimers());
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches after debounce delay for queries of 2+ characters", async () => {
    mockFetchResults([]);
    renderHook(() => useIconSearch("pl"));
    act(() => jest.runAllTimers());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=pl"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns suggestions from API response", async () => {
    const mockResults = [
      { slug: "plex", name: "Plex", url: "https://cdn.example.com/plex.svg" },
    ];
    mockFetchResults(mockResults);

    const { result } = renderHook(() => useIconSearch("plex"));
    act(() => jest.runAllTimers());

    await waitFor(() =>
      expect(result.current.suggestions).toEqual(mockResults),
    );
  });

  it("clears suggestions when query drops below 2 characters", async () => {
    const mockResults = [
      { slug: "plex", name: "Plex", url: "https://cdn.example.com/plex.svg" },
    ];
    mockFetchResults(mockResults);

    const { result, rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: "plex" },
    });
    act(() => jest.runAllTimers());
    await waitFor(() => expect(result.current.suggestions.length).toBe(1));

    rerender({ q: "p" });
    act(() => jest.runAllTimers());
    expect(result.current.suggestions).toEqual([]);
  });

  it("debounces — only fetches once for rapid query changes", async () => {
    mockFetchResults([]);
    const { rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: "p" },
    });
    rerender({ q: "pl" });
    rerender({ q: "ple" });
    rerender({ q: "plex" });

    act(() => jest.runAllTimers());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });
});

describe("stale and failed responses", () => {
  it("does not show the previous query's matches after a failure", async () => {
    mockFetchResults([
      { slug: "plex", name: "Plex", url: "https://cdn.example.com/plex.svg" },
    ]);
    const { result, rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: "plex" },
    });
    act(() => jest.runAllTimers());
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);
    rerender({ q: "sonarr" });
    act(() => jest.runAllTimers());

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.suggestions).toEqual([]);
  });

  it("reports a network error as a failure rather than stale matches", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useIconSearch("plex"));
    act(() => jest.runAllTimers());

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.suggestions).toEqual([]);
  });

  it("ignores a response that arrives for an older query", async () => {
    const resolvers: ((value: unknown) => void)[] = [];
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    ) as unknown as typeof fetch;

    const { result, rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: "son" },
    });
    act(() => jest.runAllTimers()); // fires the request for "son"

    rerender({ q: "sonarr" });
    act(() => jest.runAllTimers()); // fires the request for "sonarr"

    // The "son" response lands after the query has already moved on.
    await act(async () => {
      resolvers[0]({
        ok: true,
        json: async () => ({
          results: [{ slug: "son", name: "Son", url: "https://x/son.svg" }],
        }),
      });
    });

    expect(result.current.suggestions).toEqual([]);
  });
});
