import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySection } from './CategorySection'
import type { CategoryWithLinks } from '@/lib/types'

const category: CategoryWithLinks = {
  id: 1,
  name: 'Media',
  sort_order: 0,
  links: [
    { id: 1, category_id: 1, name: 'Plex', url: 'http://plex', icon_type: 'builtin', icon_value: 'plex', sort_order: 0 },
    { id: 2, category_id: 1, name: 'Jellyfin', url: 'http://jellyfin', icon_type: 'builtin', icon_value: 'jellyfin', sort_order: 1 },
  ],
}

describe('CategorySection', () => {
  beforeEach(() => localStorage.clear())

  it('renders the category name as a heading', () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    expect(screen.getByRole('heading', { name: /media/i })).toBeInTheDocument()
  })

  it('renders all link cards', () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    expect(screen.getByText('Plex')).toBeInTheDocument()
    expect(screen.getByText('Jellyfin')).toBeInTheDocument()
  })

  it('renders nothing when there are no links', () => {
    const empty: CategoryWithLinks = { ...category, links: [] }
    render(<CategorySection category={empty} intervalMs={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('collapses cards when the header button is clicked', async () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    await userEvent.click(screen.getByRole('button', { name: /media/i }))
    expect(screen.queryByText('Plex')).not.toBeInTheDocument()
    expect(screen.queryByText('Jellyfin')).not.toBeInTheDocument()
  })

  it('expands cards when a collapsed header is clicked again', async () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    const btn = screen.getByRole('button', { name: /media/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(screen.getByText('Plex')).toBeInTheDocument()
    expect(screen.getByText('Jellyfin')).toBeInTheDocument()
  })

  it('sets aria-expanded on the toggle button', async () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    const btn = screen.getByRole('button', { name: /media/i })
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('persists collapsed state to localStorage', async () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    await userEvent.click(screen.getByRole('button', { name: /media/i }))
    expect(localStorage.getItem('homebase:collapsed:1')).toBe('true')
  })

  it('clears localStorage when expanded again', async () => {
    localStorage.setItem('homebase:collapsed:1', 'true')
    render(<CategorySection category={category} intervalMs={10000} />)
    await userEvent.click(screen.getByRole('button', { name: /media/i }))
    expect(localStorage.getItem('homebase:collapsed:1')).toBeNull()
  })

  it('starts collapsed when localStorage has saved state', () => {
    localStorage.setItem('homebase:collapsed:1', 'true')
    render(<CategorySection category={category} intervalMs={10000} />)
    expect(screen.queryByText('Plex')).not.toBeInTheDocument()
  })
})
