import { render, screen, fireEvent } from '@testing-library/react'
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
})
