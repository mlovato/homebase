"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/DragHandle";
import { LinkCard } from "./LinkCard";
import { DND_TYPE } from "@/lib/linkDrop";
import type { Link } from "@/lib/types";

interface SortableLinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: number) => void;
  intervalMs: number | null;
}

export function SortableLinkCard({
  link,
  onEdit,
  onDelete,
  intervalMs,
}: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: link.id,
    data: { type: DND_TYPE.LINK, categoryId: link.category_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        className="absolute top-1 left-1 z-20 p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      />

      <LinkCard link={link} tooltip={false} intervalMs={intervalMs} />

      {/* Edit/Delete overlay */}
      <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={(e) => {
            e.preventDefault();
            onEdit(link);
          }}
          className="px-2 py-1 text-xs bg-white text-gray-800 rounded-md hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(link.id);
          }}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
