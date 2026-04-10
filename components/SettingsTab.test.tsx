import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsTab } from './SettingsTab'

const mockSetTheme = jest.fn()

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mockSetTheme }),
}))

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ health_check_interval: '5s' }),
  })
})

afterEach(() => jest.clearAllMocks())

describe('SettingsTab', () => {
  it('renders the Settings heading', () => {
    render(<SettingsTab />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
  })

  it('renders all four theme options', () => {
    render(<SettingsTab />)
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retro/i })).toBeInTheDocument()
  })

  it('calls setTheme with the selected value when a button is clicked', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with retro when Retro is clicked', () => {
    render(<SettingsTab />)
    fireEvent.click(screen.getByRole('button', { name: /retro/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('retro')
  })

  it('renders the Change Password section', () => {
    render(<SettingsTab />)
    expect(screen.getByText('Change Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SettingsTab />)
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'old' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass' } })
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
  })

  it('calls API and shows success on valid change', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    render(<SettingsTab />)
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'old' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass' } })
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), { target: { value: 'newpass' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({
        method: 'POST',
      }))
    })
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
