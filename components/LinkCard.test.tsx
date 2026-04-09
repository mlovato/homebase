import { render, screen, fireEvent } from '@testing-library/react'
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

  it('renders an anchor with target _blank and noopener', () => {
    render(<LinkCard link={baseLink} />)
    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('href', 'http://localhost:32400')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('sets title tooltip when tooltip prop is true (default)', () => {
    render(<LinkCard link={baseLink} />)
    expect(screen.getByRole('link')).toHaveAttribute('title', 'Plex')
  })

  it('omits title tooltip when tooltip prop is false', () => {
    render(<LinkCard link={baseLink} tooltip={false} />)
    expect(screen.getByRole('link')).not.toHaveAttribute('title')
  })

  it('renders a CDN img for builtin icon type', () => {
    render(<LinkCard link={baseLink} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('plex.svg'))
    expect(img).toHaveAttribute('alt', 'Plex')
  })

  it('renders an img for upload icon type', () => {
    const link: Link = { ...baseLink, icon_type: 'upload', icon_value: '/uploads/icon.png' }
    render(<LinkCard link={link} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('uploads'))
  })

  it('renders an img for url icon type', () => {
    const link: Link = { ...baseLink, icon_type: 'url', icon_value: 'https://example.com/icon.png' }
    render(<LinkCard link={link} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png')
  })

  it('renders a letter fallback when icon_value is null', () => {
    const link: Link = { ...baseLink, icon_type: 'builtin', icon_value: null }
    render(<LinkCard link={link} />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('falls back through -light and -dark variants before showing letter avatar', () => {
    render(<LinkCard link={{ ...baseLink, icon_value: 'unknownservice' }} />)

    // First attempt: unknownservice.svg
    fireEvent.error(screen.getByRole('img'))
    // Second attempt: unknownservice-light.svg
    fireEvent.error(screen.getByRole('img'))
    // Third attempt: unknownservice-dark.svg
    fireEvent.error(screen.getByRole('img'))
    // All variants exhausted → letter avatar
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows -light variant src on first error', () => {
    render(<LinkCard link={{ ...baseLink, icon_value: 'myservice' }} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('myservice-light.svg'))
  })
})
