import { render, screen } from '@testing-library/react'
import { LinkCard } from './LinkCard'
import type { Link } from '@/lib/types'

const baseLink: Link = {
  id: 1,
  category_id: 1,
  name: 'Plex',
  url: 'http://localhost:32400',
  icon_type: 'builtin',
  icon_value: 'plex',
  sort_order: 0,
}

describe('LinkCard', () => {
  it('renders the link name', () => {
    render(<LinkCard link={baseLink} />)
    expect(screen.getByText('Plex')).toBeInTheDocument()
  })

  it('renders an anchor with target _blank', () => {
    render(<LinkCard link={baseLink} />)
    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('href', 'http://localhost:32400')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders an img for upload icon type', () => {
    const link: Link = { ...baseLink, icon_type: 'upload', icon_value: '/uploads/icon.png' }
    render(<LinkCard link={link} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('uploads'))
    expect(img).toHaveAttribute('alt', 'Plex')
  })

  it('renders an img for url icon type', () => {
    const link: Link = { ...baseLink, icon_type: 'url', icon_value: 'https://example.com/icon.png' }
    render(<LinkCard link={link} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
  })

  it('renders a letter fallback when icon_value is null', () => {
    const link: Link = { ...baseLink, icon_type: 'builtin', icon_value: null }
    render(<LinkCard link={link} />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('renders a letter fallback for unknown builtin slug', () => {
    const link: Link = { ...baseLink, icon_value: 'unknownservice12345' }
    render(<LinkCard link={link} />)
    // Should show first letter fallback
    expect(screen.getByText('P')).toBeInTheDocument()
  })
})
