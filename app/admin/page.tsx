'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { CategoryWithLinks, Link, Category } from '@/lib/types'
import { AdminCategoryForm } from '@/components/AdminCategoryForm'
import { AdminLinkForm } from '@/components/AdminLinkForm'
import { SortableLinkCard } from '@/components/SortableLinkCard'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'

type Modal =
  | { type: 'none' }
  | { type: 'create-category' }
  | { type: 'edit-category'; category: Category }
  | { type: 'create-link'; categoryId: number | null }
  | { type: 'edit-link'; link: Link }

type Tab = 'links' | 'settings'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('links')
  const [categories, setCategories] = useState<CategoryWithLinks[]>([])
  const [uncategorized, setUncategorized] = useState<Link[]>([])
  const [modal, setModal] = useState<Modal>({ type: 'none' })
  const [loading, setLoading] = useState(true)

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/categories')
    if (!res.ok) return
    const data = await res.json()
    setCategories(data.categories)
    setUncategorized(data.uncategorized)
  }, [])

  useEffect(() => {
    loadCategories().finally(() => setLoading(false))
  }, [loadCategories])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  // ── Category handlers ─────────────────────────────────────────────────────

  async function handleCreateCategory(data: { name: string }) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleUpdateCategory(id: number, data: { name: string }) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category? Links will become uncategorized.')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    await loadCategories()
  }

  // ── Link handlers ─────────────────────────────────────────────────────────

  async function handleCreateLink(data: any) {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleUpdateLink(id: number, data: any) {
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { setModal({ type: 'none' }); await loadCategories() }
  }

  async function handleDeleteLink(id: number) {
    if (!confirm('Delete this link?')) return
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    await loadCategories()
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(event: DragEndEvent, categoryId: number | null) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const isCategorized = categoryId !== null
    const list = isCategorized
      ? categories.find(c => c.id === categoryId)?.links ?? []
      : uncategorized

    const oldIndex = list.findIndex(l => l.id === active.id)
    const newIndex = list.findIndex(l => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...list]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    if (isCategorized) {
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

  const allCategories: Category[] = categories.map(({ links: _, ...c }) => c)

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
      {/* Top header */}
      <header className="border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 retro:text-retro-green">Dashy</a>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 retro:text-retro-dim hover:text-indigo-600 retro:hover:text-retro-green transition-colors">← Dashboard</a>
          <button onClick={handleLogout} className="text-sm text-gray-500 retro:text-retro-dim hover:text-red-500 retro:hover:text-retro-green transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg p-4 flex flex-col gap-1">
          {navItem('links',
            'Links',
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          {navItem('settings',
            'Settings',
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8 retro:bg-retro-bg">
          {tab === 'links' && (
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
            />
          )}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>

      {/* Modals */}
      {modal.type !== 'none' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }) }}
        >
          <div className="bg-white dark:bg-gray-800 retro:bg-retro-surface retro:border retro:border-retro-dim retro:rounded-none rounded-2xl shadow-xl p-6 w-full max-w-md">
            {modal.type === 'create-category' && (
              <>
                <h3 className="text-lg font-semibold mb-4">New Category</h3>
                <AdminCategoryForm onSubmit={handleCreateCategory} onCancel={() => setModal({ type: 'none' })} />
              </>
            )}
            {modal.type === 'edit-category' && (
              <>
                <h3 className="text-lg font-semibold mb-4">Rename Category</h3>
                <AdminCategoryForm
                  initialName={modal.category.name}
                  onSubmit={data => handleUpdateCategory(modal.category.id, data)}
                  onCancel={() => setModal({ type: 'none' })}
                />
              </>
            )}
            {modal.type === 'create-link' && (
              <>
                <h3 className="text-lg font-semibold mb-4">New Link</h3>
                <AdminLinkForm
                  categories={allCategories}
                  initialValues={
                    modal.categoryId !== null
                      ? { name: '', url: '', icon_type: 'builtin', icon_value: null, category_id: modal.categoryId }
                      : undefined
                  }
                  onSubmit={handleCreateLink}
                  onCancel={() => setModal({ type: 'none' })}
                />
              </>
            )}
            {modal.type === 'edit-link' && (
              <>
                <h3 className="text-lg font-semibold mb-4">Edit Link</h3>
                <AdminLinkForm
                  categories={allCategories}
                  initialValues={{
                    name: modal.link.name,
                    url: modal.link.url,
                    icon_type: modal.link.icon_type,
                    icon_value: modal.link.icon_value,
                    category_id: modal.link.category_id,
                  }}
                  onSubmit={data => handleUpdateLink(modal.link.id, data)}
                  onCancel={() => setModal({ type: 'none' })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Links tab ────────────────────────────────────────────────────────────────

function LinksTab({
  categories, uncategorized, allCategories, loading, modal, setModal,
  sensors, handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
  handleCreateLink, handleUpdateLink, handleDeleteLink, handleDragEnd,
}: any) {
  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold">Links</h2>
        <button
          onClick={() => setModal({ type: 'create-category' })}
          className="px-4 py-2 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-transparent retro:border retro:border-retro-green retro:text-retro-green text-white text-sm font-medium hover:bg-indigo-700 retro:hover:bg-retro-dim transition-colors"
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 && uncategorized.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-2">No categories yet</p>
          <p className="text-sm">Click "Add Category" to get started.</p>
        </div>
      )}

      {categories.map((category: CategoryWithLinks) => (
        <section key={category.id} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 retro:text-retro-green uppercase tracking-wider">
              {category.name}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ type: 'create-link', categoryId: category.id })}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                + Add Link
              </button>
              <button
                onClick={() => setModal({ type: 'edit-category', category })}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="px-3 py-1.5 text-xs rounded-lg text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {category.links.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic px-1">
              No links in this category.{' '}
              <button className="text-indigo-500 hover:underline" onClick={() => setModal({ type: 'create-link', categoryId: category.id })}>
                Add one
              </button>
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => handleDragEnd(e, category.id)}>
              <SortableContext items={category.links.map((l: Link) => l.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {category.links.map((link: Link) => (
                    <SortableLinkCard key={link.id} link={link} onEdit={link => setModal({ type: 'edit-link', link })} onDelete={handleDeleteLink} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      ))}

      {uncategorized.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uncategorized</h3>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => handleDragEnd(e, null)}>
            <SortableContext items={uncategorized.map((l: Link) => l.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {uncategorized.map((link: Link) => (
                  <SortableLinkCard key={link.id} link={link} onEdit={link => setModal({ type: 'edit-link', link })} onDelete={handleDeleteLink} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}

      <div className="mt-4">
        <button onClick={() => setModal({ type: 'create-link', categoryId: null })} className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          + Add uncategorized link
        </button>
      </div>
    </>
  )
}

// ── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { theme, setTheme } = useTheme()

  const themeOptions: { value: string; label: string; icon: React.ReactNode }[] = [
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

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold retro:text-retro-green mb-8">Settings</h2>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4">
          Appearance
        </h3>
        <div className="flex flex-wrap gap-3">
          {themeOptions.map(opt => (
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
