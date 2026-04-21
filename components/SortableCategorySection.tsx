"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/DragHandle";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableLinkCard } from "@/components/SortableLinkCard";
import { DND_TYPE, linkContainerId, sortableCategoryId } from "@/lib/linkDrop";
import type { CategoryWithLinks, Link } from "@/lib/types";

interface SortableCategorySectionProps {
  category: CategoryWithLinks;
  onAddLink: (categoryId: number) => void;
  onEditCategory: (category: CategoryWithLinks) => void;
  onDeleteCategory: (id: number) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: number) => void;
  intervalMs: number | null;
}

export function SortableCategorySection({
  category,
  onAddLink,
  onEditCategory,
  onDeleteCategory,
  onEditLink,
  onDeleteLink,
  intervalMs,
}: SortableCategorySectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableCategoryId(category.id),
    data: { type: DND_TYPE.CATEGORY },
  });
  const containerId = linkContainerId(category.id);
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: containerId,
    data: { type: DND_TYPE.LINK_CONTAINER, categoryId: category.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className="mb-8 md:mb-10 group/category"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            className="p-1 rounded opacity-100 md:opacity-0 md:group-hover/category:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 retro:text-retro-green uppercase tracking-wider">
            {category.name}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAddLink(category.id)}
            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            + Add Link
          </button>
          <button
            onClick={() => onEditCategory(category)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Rename
          </button>
          <button
            onClick={() => onDeleteCategory(category.id)}
            className="px-3 py-1.5 text-xs rounded-lg text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <SortableContext
        id={containerId}
        items={category.links.map((l) => l.id)}
        strategy={rectSortingStrategy}
      >
        <div ref={setDroppableRef}>
          {category.links.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic px-1 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              No links in this category. Drop a link here or{" "}
              <button
                className="text-indigo-500 hover:underline"
                onClick={() => onAddLink(category.id)}
              >
                add one
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {category.links.map((link) => (
                <SortableLinkCard
                  key={link.id}
                  link={link}
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                  intervalMs={intervalMs}
                />
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
