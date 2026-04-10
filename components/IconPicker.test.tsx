import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconPicker } from './IconPicker'

const noOp = jest.fn()
const defaultValue = { icon_type: 'builtin' as const, icon_value: null }

beforeEach(() => {
  jest.useFakeTimers()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [] }),
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('IconPicker', () => {
  it('renders three tabs: Built-in, Upload, URL', () => {
    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    expect(screen.getByRole('button', { name: /built-in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /url/i })).toBeInTheDocument()
  })

  it('shows icon search input by default (builtin tab)', () => {
    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    expect(screen.getByPlaceholderText(/search icon/i)).toBeInTheDocument()
  })

  it('shows file input when upload tab is selected', () => {
    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))
    expect(screen.getByLabelText(/icon file/i)).toBeInTheDocument()
  })

  it('shows url input when url tab is selected', () => {
    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    fireEvent.click(screen.getByRole('button', { name: /url/i }))
    expect(screen.getByPlaceholderText(/https:\/\/example\.com/i)).toBeInTheDocument()
  })

  it('shows icon preview when a slug is set', () => {
    render(<IconPicker value={{ icon_type: 'builtin', icon_value: 'plex' }} onChange={noOp} serviceName="" />)
    expect(screen.getByAltText('plex')).toHaveAttribute('src', expect.stringContaining('plex.svg'))
  })

  it('shows suggestion dropdown when search returns results', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ slug: 'plex', name: 'Plex', url: 'https://cdn.example.com/plex.svg' }],
      }),
    })

    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    fireEvent.change(screen.getByPlaceholderText(/search icon/i), { target: { value: 'pl' } })

    await act(async () => { jest.runAllTimers() })

    await waitFor(() => expect(screen.getByText('Plex')).toBeInTheDocument())
  })

  it('calls onChange with selected slug when suggestion is clicked', async () => {
    const onChange = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ slug: 'plex', name: 'Plex', url: 'https://cdn.example.com/plex.svg' }],
      }),
    })

    render(<IconPicker value={defaultValue} onChange={onChange} serviceName="" />)
    fireEvent.change(screen.getByPlaceholderText(/search icon/i), { target: { value: 'pl' } })

    await act(async () => { jest.runAllTimers() })
    await waitFor(() => screen.getByText('Plex'))

    fireEvent.mouseDown(screen.getByText('Plex'))
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'builtin', icon_value: 'plex' })
  })

  it('preview image resets after slug error when user types a new slug', () => {
    render(<IconPicker value={defaultValue} onChange={noOp} serviceName="" />)
    const input = screen.getByPlaceholderText(/search icon/i)

    fireEvent.change(input, { target: { value: 'xx' } })
    const img = screen.getByAltText('xx')
    fireEvent.error(img)
    expect(img.style.display).toBe('none')

    fireEvent.change(input, { target: { value: 'plex' } })
    const newImg = screen.getByAltText('plex')
    expect(newImg.style.display).not.toBe('none')
  })

  it('calls onChange when url tab value is entered', () => {
    const onChange = jest.fn()
    render(<IconPicker value={{ icon_type: 'url', icon_value: null }} onChange={onChange} serviceName="" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com/i), {
      target: { value: 'https://example.com/icon.png' },
    })
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'url', icon_value: 'https://example.com/icon.png' })
  })
})
