/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import {
  HealthCheckProvider,
  useHealthStatus,
  checkHealthClient,
} from "./HealthCheckContext";
import type { HealthStatus } from "@/app/api/health/handler";
import type { Checker } from "./HealthCheckContext";
import { FETCH_TIMEOUT_MS } from "@/lib/fetchTimeout";

function StatusConsumer({ url }: { url: string }) {
  const status = useHealthStatus(url);
  return <span data-testid="status">{status}</span>;
}

describe("checkHealthClient", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  /** The gate answers; what the browser's own probe does decides the status. */
  function dashboardUpThen(
    probe: () => Promise<unknown> = async () => ({ ok: true }),
  ) {
    global.fetch = jest.fn(async (input: string) =>
      input === "/api/health" ? { ok: true } : probe(),
    ) as unknown as typeof fetch;
    return global.fetch as jest.Mock;
  }

  const gateCallCount = (spy: jest.Mock) =>
    spy.mock.calls.filter(([url]) => url === "/api/health").length;

  it('returns "up" when the dashboard answers and the browser reaches the service', async () => {
    dashboardUpThen();
    expect(await checkHealthClient("http://192.168.1.120:4000")).toBe("up");
  });

  it('returns "down" when the dashboard answers but the browser cannot reach the service', async () => {
    dashboardUpThen(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await checkHealthClient("http://192.168.1.120:4000")).toBe("down");
  });

  it('returns "down" when browser is offline (dashboard unreachable)', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await checkHealthClient("http://down.local")).toBe("down");
  });

  it('returns "unknown" for empty url', async () => {
    expect(await checkHealthClient("")).toBe("unknown");
  });

  it('returns "unknown" for non-http url', async () => {
    expect(await checkHealthClient("ftp://something.local")).toBe("unknown");
  });

  // The server's own probe of the url was never read.
  it("asks the dashboard without a url, then sends a no-cors HEAD", async () => {
    const spy = dashboardUpThen();
    await checkHealthClient("http://ha.local:8123/path?q=1");
    expect(spy).toHaveBeenNthCalledWith(1, "/api/health", {
      signal: expect.any(AbortSignal),
    });
    expect(spy).toHaveBeenNthCalledWith(2, "http://ha.local:8123/path?q=1", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
  });

  it("shares one gate call between checks that run together", async () => {
    const spy = dashboardUpThen();
    const urls = ["http://a.local", "http://b.local", "http://c.local"];

    const statuses = await Promise.all(urls.map(checkHealthClient));

    expect(statuses).toEqual(["up", "up", "up"]);
    expect(gateCallCount(spy)).toBe(1);
  });

  it("asks the dashboard again on the next round", async () => {
    const spy = dashboardUpThen();
    await checkHealthClient("http://a.local");
    await checkHealthClient("http://a.local");
    expect(gateCallCount(spy)).toBe(2);
  });

  it('returns "down" when client check times out on unreachable IP', async () => {
    dashboardUpThen(async () => {
      throw new DOMException("The operation was aborted.");
    });
    expect(await checkHealthClient("http://192.168.1.120:8989")).toBe("down");
  });

  it("clears the abort timer when the browser probe throws", async () => {
    dashboardUpThen(async () => {
      throw new TypeError("Failed to fetch");
    });

    jest.useFakeTimers();
    try {
      await checkHealthClient("http://192.168.1.120:8989");
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  // The browser-side probe was bounded but the gate was not, so one stalled
  // request left the whole polling chain awaiting it and no dot ever updated.
  it("gives up on a gate call that never answers", async () => {
    jest.useFakeTimers();
    let aborted = false;
    global.fetch = jest.fn(
      (_url, init) =>
        new Promise((_, reject) => {
          (init as RequestInit).signal!.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
    ) as unknown as typeof fetch;

    const settled = checkHealthClient("http://ha.local");
    await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);

    expect(aborted).toBe(true);
    await expect(settled).resolves.toBe("down");
    jest.useRealTimers();
  });
});

describe("useHealthStatus", () => {
  it("returns unknown when no provider is present", () => {
    render(<StatusConsumer url="http://a.local" />);
    expect(screen.getByTestId("status")).toHaveTextContent("unknown");
  });

  it("returns unknown initially before first check completes", () => {
    const checker: Checker = jest.fn().mockReturnValue(new Promise(() => {}));
    render(
      <HealthCheckProvider
        urls={["http://a.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <StatusConsumer url="http://a.local" />
      </HealthCheckProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("unknown");
  });

  it("returns status after check completes", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local", "http://b.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <StatusConsumer url="http://a.local" />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("status")).toHaveTextContent("up");
  });

  it("returns unknown for a url not in the urls list", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <StatusConsumer url="http://missing.local" />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("status")).toHaveTextContent("unknown");
  });
});

describe("HealthCheckProvider", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    // Unconditional, so a failing assertion cannot leak "hidden" into the
    // tests that follow.
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  it("calls checker for each url on mount", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local", "http://b.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(checker).toHaveBeenCalledWith("http://a.local");
    expect(checker).toHaveBeenCalledWith("http://b.local");
  });

  it("does not check when urls is empty", () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider urls={[]} intervalMs={10000} checker={checker}>
        <span />
      </HealthCheckProvider>,
    );
    expect(checker).not.toHaveBeenCalled();
  });

  it("does not check when intervalMs is null", () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local"]}
        intervalMs={null}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    expect(checker).not.toHaveBeenCalled();
  });

  it("updates each url independently as its check completes", async () => {
    let resolveB!: (status: HealthStatus) => void;
    const checker: Checker = jest.fn().mockImplementation((url: string) => {
      if (url === "http://a.local")
        return Promise.resolve("up" as HealthStatus);
      return new Promise<HealthStatus>((res) => {
        resolveB = res;
      });
    });

    render(
      <HealthCheckProvider
        urls={["http://a.local", "http://b.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <StatusConsumer url="http://a.local" />
        <StatusConsumer url="http://b.local" />
      </HealthCheckProvider>,
    );

    await act(async () => {});

    const [statusA, statusB] = screen.getAllByTestId("status");
    expect(statusA).toHaveTextContent("up");
    expect(statusB).toHaveTextContent("unknown");

    await act(async () => {
      resolveB("down" as HealthStatus);
    });
    expect(statusB).toHaveTextContent("down");
  });

  // The url list is rebuilt from component state, so a drag-and-drop reorder
  // hands the provider the same urls in a new order. Restarting on that fires a
  // fresh round of pings at every service for a change it cannot see.
  it("does not restart when only the order of the urls changes", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    const { rerender } = render(
      <HealthCheckProvider
        urls={["http://a.local", "http://b.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(checker).toHaveBeenCalledTimes(2);

    rerender(
      <HealthCheckProvider
        urls={["http://b.local", "http://a.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});

    expect(checker).toHaveBeenCalledTimes(2);
  });

  it("checks a url shared by two links only once per cycle", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local", "http://a.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});

    expect(checker).toHaveBeenCalledTimes(1);
  });

  // Documented behaviour: polling pauses while the tab is hidden. Without this
  // a dashboard left open in a background tab pings every service forever.
  it("stops polling while the tab is hidden", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    render(
      <HealthCheckProvider
        urls={["http://a.local"]}
        intervalMs={1000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(checker).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(checker).toHaveBeenCalledTimes(1);
  });

  it("restarts health checks when tab becomes visible", async () => {
    const checker: Checker = jest.fn().mockResolvedValue("up" as HealthStatus);
    render(
      <HealthCheckProvider
        urls={["http://a.local"]}
        intervalMs={10000}
        checker={checker}
      >
        <span />
      </HealthCheckProvider>,
    );
    await act(async () => {});
    expect(checker).toHaveBeenCalledTimes(1);

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});

    expect(checker).toHaveBeenCalledTimes(2);
  });
});
