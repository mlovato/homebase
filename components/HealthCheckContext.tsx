"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { HealthStatus } from "@/app/api/health/handler";
import { withFetchTimeout } from "@/lib/fetchTimeout";

type StatusMap = Record<string, HealthStatus>;

export const HealthCheckContext = createContext<StatusMap>({});

export function useHealthStatus(url: string): HealthStatus {
  return useContext(HealthCheckContext)[url] ?? "unknown";
}

export async function checkHealthClient(url: string): Promise<HealthStatus> {
  if (!url) return "unknown";
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    return "unknown";

  // Server call acts as an offline gate — if this fails the browser is
  // offline and no-cors would give a false positive (see 8586023)
  try {
    await fetch(`/api/health?url=${encodeURIComponent(url)}`);
  } catch {
    return "down";
  }

  // Verify the browser can actually reach the service — catches local-only
  // services the server sees but the browser cannot (e.g. on cellular),
  // and handles .local mDNS that Docker cannot resolve (see e23a2d8).
  // Timeout prevents hanging on unreachable private IPs with no route.
  try {
    await withFetchTimeout((signal) =>
      fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal,
      }),
    );
    return "up";
  } catch {
    return "down";
  }
}

export type Checker = (url: string) => Promise<HealthStatus>;

interface HealthCheckProviderProps {
  urls: string[];
  intervalMs: number | null;
  checker?: Checker;
  children: React.ReactNode;
}

export function HealthCheckProvider({
  urls,
  intervalMs,
  checker = checkHealthClient,
  children,
}: HealthCheckProviderProps) {
  const [statuses, setStatuses] = useState<StatusMap>({});
  const checkerRef = useRef(checker);
  checkerRef.current = checker;
  // Deduplicated and order-independent: the caller rebuilds this list from
  // component state, so a drag-and-drop reorder hands over the same urls in a
  // new order, and two links can legitimately share one url. Keying on the raw
  // array restarted the whole cycle for a reorder and pinged shared urls twice.
  const urlsKey = JSON.stringify([...new Set(urls)].sort());

  useEffect(() => {
    const targets: string[] = JSON.parse(urlsKey);
    if (targets.length === 0 || intervalMs === null) return;

    let cycleId = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const check = async () => {
      const id = ++cycleId;
      await Promise.all(
        targets.map(async (url) => {
          const status = await checkerRef.current(url);
          if (id !== cycleId) return;
          setStatuses((prev) =>
            prev[url] === status ? prev : { ...prev, [url]: status },
          );
        }),
      );
      if (id !== cycleId) return;
      // Hidden tabs stop polling; onVisibilityChange restarts the chain. Without
      // this a dashboard left open in a background tab pings every service for
      // as long as the browser is running.
      if (document.visibilityState === "hidden") return;
      timeoutId = setTimeout(check, intervalMs);
    };

    check();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        check();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cycleId++;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [urlsKey, intervalMs]);

  return (
    <HealthCheckContext.Provider value={statuses}>
      {children}
    </HealthCheckContext.Provider>
  );
}
