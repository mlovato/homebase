/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { StatusDot } from './StatusDot'

function mockFetch(status: 'up' | 'down' | 'unknown') {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status }),
  })
}

describe('StatusDot', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders grey dot while loading', () => {
    global.fetch = mockFetch('up')
    render(<StatusDot url="http://plex.local:32400" />)
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', 'checking')
  })

  it('renders green dot when service is up', async () => {
    global.fetch = mockFetch('up')
    render(<StatusDot url="http://plex.local:32400" />)
    await act(async () => { jest.runOnlyPendingTimers() })
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', 'online')
  })

  it('renders red dot when service is down', async () => {
    global.fetch = mockFetch('down')
    render(<StatusDot url="http://broken.local" />)
    await act(async () => { jest.runOnlyPendingTimers() })
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', 'offline')
  })

  it('renders grey dot for unknown status (non-http url)', async () => {
    global.fetch = mockFetch('unknown')
    render(<StatusDot url="ftp://something.local" />)
    await act(async () => { jest.runOnlyPendingTimers() })
    const dot = screen.getByRole('status')
    expect(dot).toHaveAttribute('aria-label', 'checking')
  })
})
