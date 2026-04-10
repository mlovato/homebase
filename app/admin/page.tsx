'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import type { CategoryWithLinks, Link, Category, CreateLinkInput, UpdateLinkInput, UserRole } from '@/lib/types'
import { HEALTH_CHECK_INTERVALS, INTERVAL_TO_MS } from '@/lib/types'
import { LinksTab, type LinksTabProps } from '@/components/LinksTab'
import { SettingsTab } from '@/components/SettingsTab'
import { UsersTab } from '@/components/UsersTab'
import { UserAvatar } from '@/components/UserAvatar'
import { HealthCheckProvider } from '@/components/HealthCheckContext'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

type Modal = LinksTabProps['modal']
type Tab = 'links' | 'settings' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('links')
  const [categories, setCategories] = useState<CategoryWithLinks[]>([])
  const [uncategorized, setUncategorized] = useState<Link[]>([])
  const [modal, setModal] = useState<Modal>({ type: 'none' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intervalMs, setIntervalMs] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; email: string; avatar: string | null } | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(msg: string) {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 5000)
  }

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/categories')
    if (!res.ok) { showError('Failed to load links. Please refresh.'); return }
    const data = await res.json()
    setCategories(data.categories)
    setUncategorized(data.uncategorized)
  }, [])

  useEffect(() => {
    loadCategories().finally(() => setLoading(false))
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        const interval = data.health_check_interval
        if (interval && HEALTH_CHECK_INTERVALS.includes(interval)) {
          setIntervalMs(INTERVAL_TO_MS[interval as keyof typeof INTERVAL_TO_MS])
        }
      })
      .catch(() => {})
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.role && data.email) setCurrentUser({ role: data.role, email: data.email, avatar: data.avatar ?? null })
      })
      .catch(() => {})
  }, [loadCategories])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  // ── Category handlers ─────────────────────────────────────────────────────

  async function apiCall(fn: () => Promise<Response>, successFn?: () => void): Promise<boolean> {
    try {
      const res = await fn()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error ?? `Request failed (${res.status})`)
        return false
      }
      successFn?.()
      return true
    } catch {
      showError('Network error — please check your connection.')
      return false
    }
  }

  async function handleCreateCategory(data: { name: string }) {
    const ok = await apiCall(
      () => fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    )
    if (ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleUpdateCategory(id: number, data: { name: string }) {
    const ok = await apiCall(
      () => fetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    )
    if (ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category? Links will become uncategorized.')) return
    const ok = await apiCall(() => fetch(`/api/categories/${id}`, { method: 'DELETE' }))
    if (ok) await loadCategories()
  }

  // ── Link handlers ─────────────────────────────────────────────────────────

  async function handleCreateLink(data: CreateLinkInput) {
    const ok = await apiCall(
      () => fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    )
    if (ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleUpdateLink(id: number, data: Partial<UpdateLinkInput>) {
    const ok = await apiCall(
      () => fetch(`/api/links/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    )
    if (ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleDeleteLink(id: number) {
    if (!confirm('Delete this link?')) return
    const ok = await apiCall(() => fetch(`/api/links/${id}`, { method: 'DELETE' }))
    if (ok) await loadCategories()
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(event: DragEndEvent, categoryId: number | null) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const list = categoryId !== null
      ? categories.find(c => c.id === categoryId)?.links ?? []
      : uncategorized

    const oldIndex = list.findIndex(l => l.id === active.id)
    const newIndex = list.findIndex(l => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(list, oldIndex, newIndex)

    if (categoryId !== null) {
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, links: reordered } : c))
    } else {
      setUncategorized(reordered)
    }

    await Promise.all(
      reordered.map((link, index) =>
        fetch(`/api/links/${link.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index }),
        })
      )
    )
  }

  const allCategories = useMemo<Category[]>(
    () => categories.map(({ links: _, ...c }) => c),
    [categories]
  )
  const allUrls = useMemo(
    () => [...categories.flatMap(c => c.links.map(l => l.url)), ...uncategorized.map(l => l.url)],
    [categories, uncategorized]
  )

  const navItem = (t: Tab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg retro:rounded-none text-sm font-medium transition-colors ${
        tab === t
          ? 'bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:text-retro-green retro:border-l-2 retro:border-retro-green text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 retro:text-retro-dim hover:bg-gray-100 dark:hover:bg-gray-700 retro:hover:bg-transparent retro:hover:text-retro-green'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <NextLink href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="Homebase" className="w-10 h-10 object-contain" />
          </NextLink>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </div>
        <NextLink href="/" className="flex items-center gap-2 text-sm text-gray-500 retro:text-retro-dim hover:text-indigo-600 retro:hover:text-retro-green transition-colors">
          {currentUser && <UserAvatar avatar={currentUser.avatar} email={currentUser.email} size="header" />}
          ← Dashboard
        </NextLink>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg p-4 flex flex-col gap-1">
          {navItem('links', 'Links',
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          {navItem('settings', 'Settings',
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          {currentUser?.role === 'admin' && navItem('users', 'Users',
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 retro:border-retro-dim">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg retro:rounded-none text-sm font-medium text-gray-600 dark:text-gray-400 retro:text-retro-dim hover:bg-gray-100 dark:hover:bg-gray-700 retro:hover:bg-transparent hover:text-red-500 retro:hover:text-retro-green transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 retro:bg-retro-bg">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 retro:bg-transparent retro:border retro:border-retro-green border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 retro:text-retro-green text-sm">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600 retro:text-retro-dim retro:hover:text-retro-green">✕</button>
            </div>
          )}
          {tab === 'links' && (
            <HealthCheckProvider urls={allUrls} intervalMs={intervalMs}>
              <LinksTab
                categories={categories}
                uncategorized={uncategorized}
                allCategories={allCategories}
                loading={loading}
                modal={modal}
                setModal={setModal}
                sensors={sensors}
                handleCreateCategory={handleCreateCategory}
                handleUpdateCategory={handleUpdateCategory}
                handleDeleteCategory={handleDeleteCategory}
                handleCreateLink={handleCreateLink}
                handleUpdateLink={handleUpdateLink}
                handleDeleteLink={handleDeleteLink}
                handleDragEnd={handleDragEnd}
                intervalMs={intervalMs}
              />
            </HealthCheckProvider>
          )}
          {tab === 'settings' && (
            <SettingsTab onIntervalChange={v => setIntervalMs(INTERVAL_TO_MS[v])} />
          )}
          {tab === 'users' && currentUser?.role === 'admin' && (
            <UsersTab showError={showError} />
          )}
        </main>
      </div>
    </div>
  )
}
