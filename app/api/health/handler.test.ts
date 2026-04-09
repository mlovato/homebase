/**
 * @jest-environment node
 */
import { checkHealth, type HealthStatus } from './handler'

function mockFetch(status: number, opts?: { throws?: boolean; delay?: number }) {
  return jest.fn(async (_url: string, _init?: RequestInit) => {
    if (opts?.throws) throw new Error('network error')
    return { ok: status >= 200 && status < 400, status } as Response
  })
}

describe('checkHealth', () => {
  it('returns "up" for a 200 response', async () => {
    const result = await checkHealth('http://plex.local:32400', mockFetch(200))
    expect(result).toBe<HealthStatus>('up')
  })

  it('returns "up" for a 301 redirect', async () => {
    const result = await checkHealth('http://sonarr.local:8989', mockFetch(301))
    expect(result).toBe<HealthStatus>('up')
  })

  it('returns "up" for a 500 response (service is reachable)', async () => {
    const result = await checkHealth('http://broken.local', mockFetch(500))
    expect(result).toBe<HealthStatus>('up')
  })

  it('returns "up" for a 401 response (auth required but running)', async () => {
    const result = await checkHealth('http://plex.local:32400', mockFetch(401))
    expect(result).toBe<HealthStatus>('up')
  })

  it('returns "up" for a 404 response (server responded)', async () => {
    const result = await checkHealth('http://missing.local', mockFetch(404))
    expect(result).toBe<HealthStatus>('up')
  })

  it('returns "down" when fetch throws (host unreachable)', async () => {
    const result = await checkHealth('http://unreachable.local', mockFetch(0, { throws: true }))
    expect(result).toBe<HealthStatus>('down')
  })

  it('returns "unknown" for an empty url', async () => {
    const result = await checkHealth('', mockFetch(200))
    expect(result).toBe<HealthStatus>('unknown')
  })

  it('returns "unknown" for a non-http url', async () => {
    const result = await checkHealth('ftp://something.local', mockFetch(200))
    expect(result).toBe<HealthStatus>('unknown')
  })
})
