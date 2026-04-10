import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

interface DragHandleProps {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  className?: string
}

export function DragHandle({ attributes, listeners, className }: DragHandleProps) {
  return (
    <div
      {...attributes}
      {...listeners}
      className={className ?? 'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}
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
  )
}
