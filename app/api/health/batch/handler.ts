import type { HealthStatus } from '../handler'
import { checkHealth } from '../handler'

export async function handleBatchHealth(
  urls: string[],
  checker: (url: string) => Promise<HealthStatus> = checkHealth
): Promise<Record<string, HealthStatus>> {
  if (urls.length === 0) return {}
  const entries = await Promise.all(
    urls.map(async url => {
      try {
        return [url, await checker(url)] as const
      } catch {
        return [url, 'unknown' as HealthStatus] as const
      }
    })
  )
  return Object.fromEntries(entries)
}
