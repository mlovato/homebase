import { withFetchTimeout } from "@/lib/fetchTimeout";

export type HealthStatus = "up" | "down" | "unknown";

export async function checkHealth(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<HealthStatus> {
  if (!url) return "unknown";
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    return "unknown";

  try {
    // Any HTTP response means the service is reachable (401/403 = auth required but running)
    await withFetchTimeout((signal) =>
      fetchFn(url, { method: "HEAD", signal, redirect: "follow" }),
    );
    return "up";
  } catch {
    return "down";
  }
}
