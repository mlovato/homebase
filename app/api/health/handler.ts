export type HealthStatus = 'up' | 'down' | 'unknown'

export async function checkHealth(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<HealthStatus> {
  if (!url) return 'unknown'
  if (!url.startsWith('http://') && !url.startsWith('https://')) return 'unknown'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetchFn(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    // Any HTTP response means the service is reachable (401/403 = auth required but running)
    void res
    return 'up'
  } catch {
    return 'down'
  }
}
