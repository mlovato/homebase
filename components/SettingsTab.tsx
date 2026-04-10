'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import type { HealthCheckInterval, SearchShortcut } from '@/lib/types'
import { HEALTH_CHECK_INTERVALS, DEFAULT_SEARCH_SHORTCUT, isValidShortcut } from '@/lib/types'
import { ShortcutRecorder } from './ShortcutRecorder'

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

const INTERVAL_LABELS: Record<HealthCheckInterval, string> = {
  '10s': '10s',
  '30s': '30s',
  '60s': '60s',
  'never': 'Never',
}

const actionButtonClass = 'px-4 py-2 rounded-lg retro:rounded-none border-2 border-gray-200 dark:border-gray-600 retro:border-retro-dim text-sm font-medium text-gray-600 dark:text-gray-300 retro:text-retro-green hover:border-indigo-400 dark:hover:border-indigo-500 retro:hover:border-retro-green transition-colors'

const inputClass = 'px-3 py-2 rounded-lg retro:rounded-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

interface SettingsTabProps {
  onIntervalChange?: (value: HealthCheckInterval) => void
}

export function SettingsTab({ onIntervalChange }: SettingsTabProps = {}) {
  const { theme, setTheme } = useTheme()
  const [interval, setInterval] = useState<HealthCheckInterval>('30s')
  const [shortcut, setShortcut] = useState<SearchShortcut>(DEFAULT_SEARCH_SHORTCUT)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const msgTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => { if (msgTimerRef.current) clearTimeout(msgTimerRef.current) }
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.health_check_interval) setInterval(data.health_check_interval)
        if (data.search_shortcut && isValidShortcut(data.search_shortcut)) setShortcut(data.search_shortcut)
      })
      .catch(() => {})
  }, [])

  function updateInterval(value: HealthCheckInterval) {
    setInterval(value)
    onIntervalChange?.(value)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ health_check_interval: value }),
    }).catch(() => {})
  }

  async function handleExport() {
    const res = await fetch('/api/export')
    if (!res.ok) return
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `homebase-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const text = await file.text()
    try { JSON.parse(text) } catch {
      setImportMsg({ ok: false, text: 'Invalid JSON file.' })
      return
    }

    if (!confirm('This will replace ALL existing links and categories. Continue?')) return

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    }).catch(() => null)

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}))
      setImportMsg({ ok: false, text: err?.error ?? 'Import failed.' })
    } else {
      setImportMsg({ ok: true, text: 'Imported successfully.' })
      msgTimerRef.current = setTimeout(() => setImportMsg(null), 4000)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pwNew !== pwConfirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      if (res.ok) {
        setPwMsg({ ok: true, text: 'Password updated successfully.' })
        setPwCurrent('')
        setPwNew('')
        setPwConfirm('')
        msgTimerRef.current = setTimeout(() => setPwMsg(null), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        setPwMsg({ ok: false, text: data.error ?? 'Failed to change password.' })
      }
    } catch {
      setPwMsg({ ok: false, text: 'Unable to reach the server.' })
    } finally {
      setPwLoading(false)
    }
  }

  function updateShortcut(value: SearchShortcut) {
    setShortcut(value)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_shortcut: value }),
    }).catch(() => {})
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold retro:text-retro-green mb-8">Settings</h2>

      <section className="mb-10">
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

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Keyboard Shortcuts
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300 retro:text-retro-green w-28">Open search</span>
          <ShortcutRecorder value={shortcut} onChange={updateShortcut} />
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Import / Export
        </h3>
        <div className="flex gap-3">
          <button onClick={handleExport} className={actionButtonClass}>
            Export JSON
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={actionButtonClass}>
            Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
        {importMsg && (
          <p className={`mt-3 text-xs ${importMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} retro:text-retro-green`}>
            {importMsg.text}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 retro:text-retro-dim">
          Export saves all links and categories to a JSON file. Import replaces all existing data.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Status Check Interval
        </h3>
        <div className="flex flex-wrap gap-3">
          {HEALTH_CHECK_INTERVALS.map(value => (
            <button
              key={value}
              onClick={() => updateInterval(value)}
              className={`px-5 py-3 rounded-xl retro:rounded-none border-2 text-sm font-medium transition-colors ${
                interval === value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:border-retro-green retro:text-retro-green text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-gray-600 retro:border-retro-dim hover:border-gray-300 dark:hover:border-gray-500 retro:hover:border-retro-green text-gray-600 dark:text-gray-400 retro:text-retro-dim retro:hover:text-retro-green'
              }`}
            >
              {INTERVAL_LABELS[value]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 retro:text-retro-dim">
          How often to ping each service. Set to Never to hide status indicators.
        </p>
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-xs">
          <div className="flex flex-col gap-1">
            <label htmlFor="pw-current" className="text-sm font-medium text-gray-700 dark:text-gray-300">Current password</label>
            <input id="pw-current" type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} required
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pw-new" className="text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
            <input id="pw-new" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} required
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pw-confirm" className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</label>
            <input id="pw-confirm" type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required
              className={inputClass} />
          </div>
          {pwMsg && (
            <p className={`text-xs ${pwMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} retro:text-retro-green`}>
              {pwMsg.text}
            </p>
          )}
          <button type="submit" disabled={pwLoading}
            className="w-full py-2.5 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-retro-dim text-white retro:text-retro-green font-medium hover:bg-indigo-700 retro:hover:bg-retro-green retro:hover:text-black disabled:opacity-60 transition-colors">
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}
