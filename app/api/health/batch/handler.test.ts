import { handleBatchHealth } from './handler'
import type { HealthStatus } from '../handler'

const up = async (): Promise<HealthStatus> => 'up'
const down = async (): Promise<HealthStatus> => 'down'
const unknown = async (): Promise<HealthStatus> => 'unknown'

describe('handleBatchHealth', () => {
  it('returns statuses for all provided urls', async () => {
    const checkers: Record<string, () => Promise<HealthStatus>> = {
      'http://a.local': up,
      'http://b.local': down,
    }
    const result = await handleBatchHealth(['http://a.local', 'http://b.local'], (url) => checkers[url]())
    expect(result).toEqual({ 'http://a.local': 'up', 'http://b.local': 'down' })
  })

  it('returns empty object for no urls', async () => {
    const result = await handleBatchHealth([], () => Promise.resolve('up' as HealthStatus))
    expect(result).toEqual({})
  })

  it('returns unknown for urls that throw', async () => {
    const result = await handleBatchHealth(
      ['http://fail.local'],
      () => Promise.reject(new Error('oops'))
    )
    expect(result).toEqual({ 'http://fail.local': 'unknown' })
  })

  it('checks all urls in parallel', async () => {
    const order: string[] = []
    const slow = async (url: string): Promise<HealthStatus> => {
      order.push(url)
      return 'up'
    }
    await handleBatchHealth(['http://a.local', 'http://b.local', 'http://c.local'], slow)
    expect(order).toHaveLength(3)
  })
})
