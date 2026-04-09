/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchModal } from './SearchModal'

const links = [
  { id: 1, name: 'Grafana', url: 'http://grafana.local' },
  { id: 2, name: 'Prometheus', url: 'http://prometheus.local' },
  { id: 3, name: 'Gitea', url: 'http://gitea.local' },
]

function open() {
  fireEvent.keyDown(document, { key: 'k', metaKey: true })
}

describe('SearchModal', () => {
  it('is closed by default', () => {
    render(<SearchModal links={links} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on ⌘K', () => {
    render(<SearchModal links={links} />)
    open()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens on Ctrl+K', () => {
    render(<SearchModal links={links} />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows all links when query is empty', () => {
    render(<SearchModal links={links} />)
    open()
    expect(screen.getByText('Grafana')).toBeInTheDocument()
    expect(screen.getByText('Prometheus')).toBeInTheDocument()
    expect(screen.getByText('Gitea')).toBeInTheDocument()
  })

  it('filters results by name (case-insensitive)', async () => {
    render(<SearchModal links={links} />)
    open()
    await userEvent.type(screen.getByRole('combobox'), 'GIT')
    expect(screen.queryByText('Grafana')).not.toBeInTheDocument()
    expect(screen.queryByText('Prometheus')).not.toBeInTheDocument()
    expect(screen.getByText('Gitea')).toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', async () => {
    render(<SearchModal links={links} />)
    open()
    await userEvent.type(screen.getByRole('combobox'), 'zzznomatch')
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<SearchModal links={links} />)
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clears query when reopened', async () => {
    render(<SearchModal links={links} />)
    open()
    await userEvent.type(screen.getByRole('combobox'), 'git')
    fireEvent.keyDown(document, { key: 'Escape' })
    open()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('first result is selected by default', () => {
    render(<SearchModal links={links} />)
    open()
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('ArrowDown moves selection to next item', () => {
    render(<SearchModal links={links} />)
    open()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowUp moves selection to previous item', () => {
    render(<SearchModal links={links} />)
    open()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowUp' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowDown wraps from last to first', () => {
    render(<SearchModal links={links} />)
    open()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('Enter navigates to selected result url', () => {
    render(<SearchModal links={links} />)
    open()
    const options = screen.getAllByRole('option')
    expect(options[0].closest('a')).toHaveAttribute('href', 'http://grafana.local')
  })

  it('resets selection to first when query changes', async () => {
    render(<SearchModal links={links} />)
    open()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    await userEvent.type(screen.getByRole('combobox'), 'a')
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })
})
