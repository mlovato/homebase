'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LinkCard } from './LinkCard'
import type { Link } from '@/lib/types'

interface SortableLinkCardProps {
  link: Link
  onEdit: (link: Link) => void
  onDelete: (id: number) => void
}

export function SortableLinkCard({ link, onEdit, onDelete }: SortableLinkCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle — top-left corner, visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-20 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="2" r="1.2" />
          <circle cx="8" cy="2" r="1.2" />
          <circle cx="4" cy="6" r="1.2" />
          <circle cx="8" cy="6" r="1.2" />
          <circle cx="4" cy="10" r="1.2" />
          <circle cx="8" cy="10" r="1.2" />
        </svg>
      </div>

      <LinkCard link={link} />

      {/* Edit/Delete overlay */}
      <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={e => { e.preventDefault(); onEdit(link) }}
          className="px-2 py-1 text-xs bg-white text-gray-800 rounded-md hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={e => { e.preventDefault(); onDelete(link.id) }}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
