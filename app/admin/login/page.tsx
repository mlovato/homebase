'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Login failed')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 retro:bg-retro-bg px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 retro:bg-retro-surface retro:border retro:border-retro-dim retro:rounded-none rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 retro:text-retro-green mb-1">Homebase</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 retro:text-retro-dim mb-6">Admin login</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 retro:rounded-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-retro-dim text-white retro:text-retro-green font-medium hover:bg-indigo-700 retro:hover:bg-retro-green retro:hover:text-black disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
