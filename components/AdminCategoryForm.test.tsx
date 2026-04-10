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
