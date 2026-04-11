import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminCategoryForm } from './AdminCategoryForm'

describe('AdminCategoryForm (create mode)', () => {
  it('renders a name input and submit button', () => {
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('calls onSubmit with name when form is submitted', async () => {
    const onSubmit = jest.fn()
    render(<AdminCategoryForm onSubmit={onSubmit} onCancel={jest.fn()} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Media')
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Media' })
  })

  it('focuses the name input on mount', () => {
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByLabelText(/name/i)).toHaveFocus()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn()
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('AdminCategoryForm (edit mode)', () => {
  it('pre-fills the name when initialName is provided', () => {
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} initialName="Media" />)
    expect(screen.getByDisplayValue('Media')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
})

describe('AdminCategoryForm (duplicate detection)', () => {
  it('shows error when name matches an existing category', async () => {
    const onSubmit = jest.fn()
    render(<AdminCategoryForm onSubmit={onSubmit} onCancel={jest.fn()} existingNames={['Media', 'Tools']} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Media')
    expect(screen.getByText(/same name/i)).toBeInTheDocument()
  })

  it('matches case-insensitively', async () => {
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} existingNames={['Media']} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'media')
    expect(screen.getByText(/same name/i)).toBeInTheDocument()
  })

  it('does not submit when name is a duplicate', async () => {
    const onSubmit = jest.fn()
    render(<AdminCategoryForm onSubmit={onSubmit} onCancel={jest.fn()} existingNames={['Media']} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Media')
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows the current name in edit mode', async () => {
    const onSubmit = jest.fn()
    render(<AdminCategoryForm onSubmit={onSubmit} onCancel={jest.fn()} initialName="Media" existingNames={['Media', 'Tools']} />)
    expect(screen.queryByText(/same name/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Media' })
  })

  it('shows no error when name is unique', async () => {
    render(<AdminCategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} existingNames={['Media']} />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Monitoring')
    expect(screen.queryByText(/same name/i)).not.toBeInTheDocument()
  })
})
