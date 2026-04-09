import { renderHook, act, waitFor } from '@testing-library/react'
import { useIconSearch } from './useIconSearch'

beforeEach(() => {
  jest.useFakeTimers()
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

function mockFetchResults(results: unknown[]) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  })
}

describe('useIconSearch', () => {
  it('returns empty suggestions initially', () => {
    const { result } = renderHook(() => useIconSearch(''))
    expect(result.current.suggestions).toEqual([])
  })

  it('does not fetch for queries shorter than 2 characters', async () => {
    renderHook(() => useIconSearch('p'))
    act(() => jest.runAllTimers())
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches after debounce delay for queries of 2+ characters', async () => {
    mockFetchResults([])
    const { result } = renderHook(() => useIconSearch('pl'))
    act(() => jest.runAllTimers())
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=pl')
    )
  })

  it('returns suggestions from API response', async () => {
    const mockResults = [{ slug: 'plex', name: 'Plex', url: 'https://cdn.example.com/plex.svg' }]
    mockFetchResults(mockResults)

    const { result } = renderHook(() => useIconSearch('plex'))
    act(() => jest.runAllTimers())

    await waitFor(() => expect(result.current.suggestions).toEqual(mockResults))
  })

  it('clears suggestions when query drops below 2 characters', async () => {
    const mockResults = [{ slug: 'plex', name: 'Plex', url: 'https://cdn.example.com/plex.svg' }]
    mockFetchResults(mockResults)

    const { result, rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: 'plex' },
    })
    act(() => jest.runAllTimers())
    await waitFor(() => expect(result.current.suggestions.length).toBe(1))

    rerender({ q: 'p' })
    act(() => jest.runAllTimers())
    expect(result.current.suggestions).toEqual([])
  })

  it('debounces — only fetches once for rapid query changes', async () => {
    mockFetchResults([])
    const { rerender } = renderHook(({ q }) => useIconSearch(q), {
      initialProps: { q: 'p' },
    })
    rerender({ q: 'pl' })
    rerender({ q: 'ple' })
    rerender({ q: 'plex' })

    act(() => jest.runAllTimers())
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
  })
})
