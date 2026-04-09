/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { BfcacheHandler } from './BfcacheHandler'

describe('BfcacheHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('calls onRestore when pageshow fires with persisted=true', async () => {
    const onRestore = jest.fn()
    render(<BfcacheHandler onRestore={onRestore} />)
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('does not call onRestore on pageshow with persisted=false', async () => {
    const onRestore = jest.fn()
    render(<BfcacheHandler onRestore={onRestore} />)
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }))
    })
    expect(onRestore).not.toHaveBeenCalled()
  })

  it('removes listener on unmount', async () => {
    const onRestore = jest.fn()
    const { unmount } = render(<BfcacheHandler onRestore={onRestore} />)
    unmount()
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    expect(onRestore).not.toHaveBeenCalled()
  })
})
