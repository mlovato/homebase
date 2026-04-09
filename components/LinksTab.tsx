'use client'

import type { CategoryWithLinks, Link, Category, CreateLinkInput, UpdateLinkInput } from '@/lib/types'
import { AdminCategoryForm } from '@/components/AdminCategoryForm'
import { AdminLinkForm } from '@/components/AdminLinkForm'
import { SortableLinkCard } from '@/components/SortableLinkCard'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'

type Modal =
  | { type: 'none' }
  | { type: 'create-category' }
  | { type: 'edit-category'; category: Category }
  | { type: 'create-link'; categoryId: number | null }
  | { type: 'edit-link'; link: Link }

export interface LinksTabProps {
  categories: CategoryWithLinks[]
  uncategorized: Link[]
  allCategories: Category[]
  loading: boolean
  modal: Modal
  setModal: (modal: Modal) => void
  sensors: SensorDescriptor<object>[]
  handleCreateCategory: (data: { name: string }) => Promise<void>
  handleUpdateCategory: (id: number, data: { name: string }) => Promise<void>
  handleDeleteCategory: (id: number) => Promise<void>
  handleCreateLink: (data: CreateLinkInput) => Promise<void>
  handleUpdateLink: (id: number, data: Partial<UpdateLinkInput>) => Promise<void>
  handleDeleteLink: (id: number) => Promise<void>
  handleDragEnd: (event: DragEndEvent, categoryId: number | null) => Promise<void>
  intervalMs: number | null
}

export function LinksTab({
  categories, uncategorized, allCategories, loading, modal, setModal,
  sensors, handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
  handleCreateLink, handleUpdateLink, handleDeleteLink, handleDragEnd, intervalMs,
}: LinksTabProps) {
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
          <p className="text-sm">Click &ldquo;Add Category&rdquo; to get started.</p>
        </div>
      )}

      {categories.map(category => (
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
              <SortableContext items={category.links.map(l => l.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {category.links.map(link => (
                    <SortableLinkCard key={link.id} link={link} onEdit={l => setModal({ type: 'edit-link', link: l })} onDelete={handleDeleteLink} intervalMs={intervalMs} />
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
            <SortableContext items={uncategorized.map(l => l.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {uncategorized.map(link => (
                  <SortableLinkCard key={link.id} link={link} onEdit={l => setModal({ type: 'edit-link', link: l })} onDelete={handleDeleteLink} intervalMs={intervalMs} />
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
    </>
  )
}
