import { render, screen } from '@testing-library/react'
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
  it('renders the category name as a heading', () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument()
  })

  it('renders all link cards', () => {
    render(<CategorySection category={category} intervalMs={10000} />)
    expect(screen.getByText('Plex')).toBeInTheDocument()
    expect(screen.getByText('Jellyfin')).toBeInTheDocument()
  })

  it('renders nothing when there are no links', () => {
    const empty: CategoryWithLinks = { ...category, links: [] }
    const { container } = render(<CategorySection category={empty} intervalMs={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
