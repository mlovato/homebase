'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

export default function AdminPage() {
  const router = useRouter()
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

  // ── Category handlers ──────────────────────────────────────────────────────

  async function handleCreateCategory(data: { name: string }) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setModal({ type: 'none' })
      await loadCategories()
    }
  }

  async function handleUpdateCategory(id: number, data: { name: string }) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setModal({ type: 'none' })
      await loadCategories()
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category? Links will become uncategorized.')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    await loadCategories()
  }

  // ── Link handlers ─────────────────────────────────────────────────────────

  async function handleCreateLink(data: Parameters<typeof fetch>[1] extends infer R ? any : never) {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setModal({ type: 'none' })
      await loadCategories()
    }
  }

  async function handleUpdateLink(id: number, data: any) {
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setModal({ type: 'none' })
      await loadCategories()
    }
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

    // Optimistically reorder in state
    const reordered = [...list]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    if (isCategorized) {
      setCategories(prev =>
        prev.map(c => c.id === categoryId ? { ...c, links: reordered } : c)
      )
    } else {
      setUncategorized(reordered)
    }

    // Persist new sort_order for each affected link
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Dashy
          </a>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            ← Dashboard
          </a>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Add category button */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Manage Links</h2>
          <button
            onClick={() => setModal({ type: 'create-category' })}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Add Category
          </button>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg mb-2">No categories yet</p>
            <p className="text-sm">Click "Add Category" to get started.</p>
          </div>
        )}

        {/* Category sections */}
        {categories.map(category => (
          <section key={category.id} className="mb-10">
            {/* Category header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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

            {/* Links grid */}
            {category.links.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic px-1">
                No links in this category.{' '}
                <button
                  className="text-indigo-500 hover:underline"
                  onClick={() => setModal({ type: 'create-link', categoryId: category.id })}
                >
                  Add one
                </button>
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, category.id)}>
                <SortableContext items={category.links.map(l => l.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {category.links.map(link => (
                      <SortableLinkCard
                        key={link.id}
                        link={link}
                        onEdit={link => setModal({ type: 'edit-link', link })}
                        onDelete={handleDeleteLink}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        ))}

        {/* Uncategorized links */}
        {uncategorized.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Uncategorized
              </h3>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, null)}>
              <SortableContext items={uncategorized.map(l => l.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {uncategorized.map(link => (
                    <SortableLinkCard
                      key={link.id}
                      link={link}
                      onEdit={link => setModal({ type: 'edit-link', link })}
                      onDelete={handleDeleteLink}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}

        {/* Add uncategorized link */}
        <div className="mt-4">
          <button
            onClick={() => setModal({ type: 'create-link', categoryId: null })}
            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            + Add uncategorized link
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal.type !== 'none' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }) }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
            {modal.type === 'create-category' && (
              <>
                <h3 className="text-lg font-semibold mb-4">New Category</h3>
                <AdminCategoryForm
                  onSubmit={handleCreateCategory}
                  onCancel={() => setModal({ type: 'none' })}
                />
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
    </main>
  )
}
