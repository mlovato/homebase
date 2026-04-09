/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { HealthCheckProvider, useHealthStatus, HealthCheckContext } from './HealthCheckContext'

function mockXhr(response: Record<string, string>) {
  const xhr = {
    open: jest.fn(),
    send: jest.fn(),
    abort: jest.fn(),
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    responseText: JSON.stringify(response),
  }
  jest.spyOn(global, 'XMLHttpRequest' as never).mockImplementation(() => xhr as never)
  return xhr
}

function StatusConsumer({ url }: { url: string }) {
  const status = useHealthStatus(url)
  return <span data-testid="status">{status}</span>
}

describe('useHealthStatus', () => {
  it('returns unknown when no provider is present', () => {
    render(<StatusConsumer url="http://a.local" />)
    expect(screen.getByTestId('status')).toHaveTextContent('unknown')
  })

  it('returns unknown initially before first batch response', () => {
    mockXhr({})
    render(
      <HealthCheckProvider urls={['http://a.local']} intervalMs={10000}>
        <StatusConsumer url="http://a.local" />
      </HealthCheckProvider>
    )
    expect(screen.getByTestId('status')).toHaveTextContent('unknown')
  })

  it('returns status from context after batch response', async () => {
    const xhr = mockXhr({ 'http://a.local': 'up', 'http://b.local': 'down' })
    render(
      <HealthCheckProvider urls={['http://a.local', 'http://b.local']} intervalMs={10000}>
        <StatusConsumer url="http://a.local" />
      </HealthCheckProvider>
    )
    await act(async () => { xhr.onload?.() })
    expect(screen.getByTestId('status')).toHaveTextContent('up')
  })

  it('returns unknown for a url not in the batch response', async () => {
    const xhr = mockXhr({ 'http://a.local': 'up' })
    render(
      <HealthCheckProvider urls={['http://a.local']} intervalMs={10000}>
        <StatusConsumer url="http://missing.local" />
      </HealthCheckProvider>
    )
    await act(async () => { xhr.onload?.() })
    expect(screen.getByTestId('status')).toHaveTextContent('unknown')
  })
})

describe('HealthCheckProvider', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it('makes an XHR batch request on mount', () => {
    const xhr = mockXhr({})
    render(
      <HealthCheckProvider urls={['http://a.local']} intervalMs={10000}>
        <span />
      </HealthCheckProvider>
    )
    expect(xhr.open).toHaveBeenCalledWith('GET', expect.stringContaining('/api/health/batch'))
    expect(xhr.send).toHaveBeenCalled()
  })

  it('includes all urls in the batch request', () => {
    const xhr = mockXhr({})
    render(
      <HealthCheckProvider urls={['http://a.local', 'http://b.local']} intervalMs={10000}>
        <span />
      </HealthCheckProvider>
    )
    const url = (xhr.open as jest.Mock).mock.calls[0][1] as string
    expect(url).toContain(encodeURIComponent('http://a.local'))
    expect(url).toContain(encodeURIComponent('http://b.local'))
  })

  it('does not make a request when urls is empty', () => {
    const xhr = mockXhr({})
    render(
      <HealthCheckProvider urls={[]} intervalMs={10000}>
        <span />
      </HealthCheckProvider>
    )
    expect(xhr.send).not.toHaveBeenCalled()
  })

  it('does not make a request when intervalMs is null', () => {
    const xhr = mockXhr({})
    render(
      <HealthCheckProvider urls={['http://a.local']} intervalMs={null}>
        <span />
      </HealthCheckProvider>
    )
    expect(xhr.send).not.toHaveBeenCalled()
  })
})
