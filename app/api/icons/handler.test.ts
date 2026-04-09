/**
 * @jest-environment node
 */
import { searchIcons, clearCache, METADATA_URL } from './handler'
import { DASHBOARD_ICONS_CDN as CDN_BASE } from '@/lib/constants'

const MOCK_METADATA = {
  plex: { base: 'svg', aliases: ['plex media server'], categories: ['Media'] },
  sonarr: { base: 'svg', aliases: [], categories: ['Media'] },
  calibre: { base: 'svg', aliases: ['calibre library'], categories: ['Books'] },
}

function mockFetch(data: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  }) as unknown as typeof fetch
}

beforeEach(() => {
  clearCache()
})

describe('searchIcons', () => {
  it('returns empty array for queries shorter than 2 characters', async () => {
    const results = await searchIcons('p', mockFetch(MOCK_METADATA))
    expect(results).toEqual([])
  })

  it('matches by slug', async () => {
    const results = await searchIcons('pl', mockFetch(MOCK_METADATA))
    expect(results.map(r => r.slug)).toContain('plex')
  })

  it('matches by alias', async () => {
    const results = await searchIcons('calibre library', mockFetch(MOCK_METADATA))
    expect(results.map(r => r.slug)).toContain('calibre')
  })

  it('returns slug, name, and CDN url for each result', async () => {
    const results = await searchIcons('sonarr', mockFetch(MOCK_METADATA))
    expect(results[0]).toEqual({
      slug: 'sonarr',
      name: 'Sonarr',
      url: `${CDN_BASE}/sonarr.svg`,
    })
  })

  it('derives human-readable name from kebab-case slug', async () => {
    const meta = { 'nextcloud-calendar': { aliases: [] } }
    const results = await searchIcons('nextcloud', mockFetch(meta))
    expect(results[0].name).toBe('Nextcloud Calendar')
  })

  it('returns at most 8 results', async () => {
    const bigMetadata: Record<string, { aliases: string[] }> = {}
    for (let i = 0; i < 20; i++) bigMetadata[`service${i}`] = { aliases: [] }
    const results = await searchIcons('service', mockFetch(bigMetadata))
    expect(results.length).toBeLessThanOrEqual(8)
  })

  it('returns empty array for no match', async () => {
    const results = await searchIcons('zzznomatch', mockFetch(MOCK_METADATA))
    expect(results).toEqual([])
  })

  it('fetches metadata from the correct URL', async () => {
    const fetchFn = mockFetch(MOCK_METADATA)
    await searchIcons('plex', fetchFn)
    expect(fetchFn).toHaveBeenCalledWith(METADATA_URL, expect.anything())
  })

  it('uses cached metadata on subsequent calls', async () => {
    const fetchFn = mockFetch(MOCK_METADATA)
    await searchIcons('plex', fetchFn)
    await searchIcons('sonarr', fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
