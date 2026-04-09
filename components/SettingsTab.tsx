'use client'

import { useTheme } from 'next-themes'

const THEME_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'retro',
    label: 'Retro',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export function SettingsTab() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold retro:text-retro-green mb-8">Settings</h2>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Appearance
        </h3>
        <div className="flex flex-wrap gap-3">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl retro:rounded-none border-2 transition-colors ${
                theme === opt.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:border-retro-green retro:text-retro-green text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-gray-600 retro:border-retro-dim hover:border-gray-300 dark:hover:border-gray-500 retro:hover:border-retro-green text-gray-600 dark:text-gray-400 retro:text-retro-dim retro:hover:text-retro-green'
              }`}
            >
              {opt.icon}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
