import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminLinkForm } from './AdminLinkForm'
import type { Category } from '@/lib/types'

const categories: Category[] = [
  { id: 1, name: 'Media', sort_order: 0 },
  { id: 2, name: 'Tools', sort_order: 1 },
]

describe('AdminLinkForm', () => {
  it('renders name, url, and category inputs', () => {
    render(<AdminLinkForm onSubmit={jest.fn()} onCancel={jest.fn()} categories={categories} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })

  it('calls onSubmit with form values on submit', async () => {
    const onSubmit = jest.fn()
    render(<AdminLinkForm onSubmit={onSubmit} onCancel={jest.fn()} categories={categories} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'Plex')
    await userEvent.type(screen.getByLabelText(/url/i), 'http://localhost:32400')
    fireEvent.click(screen.getByRole('button', { name: /create|save/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plex', url: 'http://localhost:32400' })
    )
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn()
    render(<AdminLinkForm onSubmit={jest.fn()} onCancel={onCancel} categories={categories} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows icon service search input when builtin tab is selected', () => {
    render(<AdminLinkForm onSubmit={jest.fn()} onCancel={jest.fn()} categories={categories} />)
    // Default is builtin — service search should be visible
    expect(screen.getByPlaceholderText(/search service/i)).toBeInTheDocument()
  })

  it('shows upload input when upload tab is selected', async () => {
    render(<AdminLinkForm onSubmit={jest.fn()} onCancel={jest.fn()} categories={categories} />)
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))
    expect(screen.getByLabelText(/icon file/i)).toBeInTheDocument()
  })

  it('pre-fills values in edit mode', () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
        initialValues={{
          name: 'Plex',
          url: 'http://localhost:32400',
          icon_type: 'builtin',
          icon_value: 'plex',
          category_id: 1,
        }}
      />
    )
    expect(screen.getByDisplayValue('Plex')).toBeInTheDocument()
    expect(screen.getByDisplayValue('http://localhost:32400')).toBeInTheDocument()
  })
})
