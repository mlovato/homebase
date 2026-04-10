/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkIcon } from './LinkIcon'

describe('LinkIcon', () => {
  it('renders an img for builtin icon type', () => {
    render(<LinkIcon name="Grafana" iconType="builtin" iconValue="grafana" size="lg" />)
    expect(screen.getByRole('img', { name: 'Grafana' })).toBeInTheDocument()
  })

  it('renders an img for url icon type', () => {
    render(<LinkIcon name="My App" iconType="url" iconValue="http://example.com/icon.png" size="lg" />)
    const img = screen.getByRole('img', { name: 'My App' })
    expect(img).toHaveAttribute('src', 'http://example.com/icon.png')
  })

  it('renders an img for upload icon type', () => {
    render(<LinkIcon name="My App" iconType="upload" iconValue="/uploads/icon.png" size="lg" />)
    const img = screen.getByRole('img', { name: 'My App' })
    expect(img).toHaveAttribute('src', '/uploads/icon.png')
  })

  it('renders letter avatar when iconValue is null', () => {
    render(<LinkIcon name="Grafana" iconType="builtin" iconValue={null} size="lg" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('falls back to letter avatar after all builtin variants fail', () => {
    render(<LinkIcon name="Grafana" iconType="builtin" iconValue="grafana" size="lg" />)
    const img = screen.getByRole('img')
    fireEvent.error(img) // base slug fails
    fireEvent.error(screen.getByRole('img')) // -light fails
    fireEvent.error(screen.getByRole('img')) // -dark fails
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('renders letter avatar when iconType is builtin but iconValue is null', () => {
    render(<LinkIcon name="Test" iconType="builtin" iconValue={null} size="sm" />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('falls back to letter avatar when upload/url image fails to load', () => {
    render(<LinkIcon name="My App" iconType="url" iconValue="http://broken.local/icon.png" size="lg" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('resets failed state when iconValue changes', () => {
    const { rerender } = render(
      <LinkIcon name="My App" iconType="upload" iconValue="/uploads/old.png" size="lg" />
    )
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    rerender(<LinkIcon name="My App" iconType="url" iconValue="http://example.com/icon.png" size="lg" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://example.com/icon.png')
  })

  it('resets failed state when iconType changes', () => {
    const { rerender } = render(
      <LinkIcon name="My App" iconType="url" iconValue="http://broken.local/icon.png" size="lg" />
    )
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    rerender(<LinkIcon name="My App" iconType="builtin" iconValue="plex" size="lg" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
