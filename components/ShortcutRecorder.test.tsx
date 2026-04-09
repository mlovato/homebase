/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShortcutRecorder } from './ShortcutRecorder'

describe('ShortcutRecorder', () => {
  it('displays the current shortcut', () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent('⌘K / Ctrl K')
  })

  it('displays single-key shortcut', () => {
    render(<ShortcutRecorder value="/" onChange={jest.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent('/')
  })

  it('shows recording prompt on click', () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent(/press/i)
  })

  it('captures mod+key combo and calls onChange', () => {
    const onChange = jest.fn()
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 's', metaKey: true })
    expect(onChange).toHaveBeenCalledWith('mod+s')
  })

  it('captures single key and calls onChange', () => {
    const onChange = jest.fn()
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: '/' })
    expect(onChange).toHaveBeenCalledWith('/')
  })

  it('cancels on Escape without calling onChange', () => {
    const onChange = jest.fn()
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveTextContent('⌘K / Ctrl K')
  })

  it('ignores modifier-only keypresses', () => {
    const onChange = jest.fn()
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Meta' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveTextContent(/press/i)
  })

  it('exits recording mode after capturing a combo', () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'p', metaKey: true })
    expect(screen.getByRole('button')).not.toHaveTextContent(/press/i)
  })
})
