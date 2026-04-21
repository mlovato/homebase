"use client";

import { useState } from "react";
import type {
  CategoryWithLinks,
  Link,
  Category,
  CreateLinkInput,
  UpdateLinkInput,
} from "@/lib/types";
import { AdminCategoryForm } from "@/components/AdminCategoryForm";
import { AdminLinkForm } from "@/components/AdminLinkForm";
import { LinkCard } from "@/components/LinkCard";
import { SortableLinkCard } from "@/components/SortableLinkCard";
import { SortableCategorySection } from "@/components/SortableCategorySection";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  DND_TYPE,
  findLinkById,
  linkContainerId,
  sortableCategoryId,
  UNCATEGORIZED_LINK_CONTAINER,
} from "@/lib/linkDrop";

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

type Modal =
  | { type: "none" }
  | { type: "create-category" }
  | { type: "edit-category"; category: Category }
  | { type: "create-link"; categoryId: number | null }
  | { type: "edit-link"; link: Link };

export interface LinksTabProps {
  categories: CategoryWithLinks[];
  uncategorized: Link[];
  allCategories: Category[];
  loading: boolean;
  modal: Modal;
  setModal: (modal: Modal) => void;
  sensors: SensorDescriptor<object>[];
  handleCreateCategory: (data: { name: string }) => Promise<void>;
  handleUpdateCategory: (id: number, data: { name: string }) => Promise<void>;
  handleDeleteCategory: (id: number) => void;
  handleCreateLink: (data: CreateLinkInput) => Promise<void>;
  handleUpdateLink: (
    id: number,
    data: Partial<UpdateLinkInput>,
  ) => Promise<void>;
  handleDeleteLink: (id: number) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  intervalMs: number | null;
}

export function LinksTab({
  categories,
  uncategorized,
  allCategories,
  loading,
  modal,
  setModal,
  sensors,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleCreateLink,
  handleUpdateLink,
  handleDeleteLink,
  handleDragEnd,
  intervalMs,
}: LinksTabProps) {
  const [activeLink, setActiveLink] = useState<Link | null>(null);

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type !== DND_TYPE.LINK) return;
    if (typeof event.active.id !== "number") return;
    setActiveLink(findLinkById(event.active.id, categories, uncategorized));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLink(null);
    await handleDragEnd(event);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl font-semibold">Links</h2>
        <button
          onClick={() => setModal({ type: "create-category" })}
          className="px-3 md:px-4 py-2 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-transparent retro:border retro:border-retro-green retro:text-retro-green text-white text-sm font-medium hover:bg-indigo-700 retro:hover:bg-retro-dim transition-colors"
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 && uncategorized.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-2">No categories yet</p>
          <p className="text-sm">
            Click &ldquo;Add Category&rdquo; to get started.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLink(null)}
      >
        <SortableContext
          items={categories.map((c) => sortableCategoryId(c.id))}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableCategorySection
              key={category.id}
              category={category}
              onAddLink={(id) =>
                setModal({ type: "create-link", categoryId: id })
              }
              onEditCategory={(cat) =>
                setModal({ type: "edit-category", category: cat })
              }
              onDeleteCategory={handleDeleteCategory}
              onEditLink={(link) => setModal({ type: "edit-link", link })}
              onDeleteLink={handleDeleteLink}
              intervalMs={intervalMs}
            />
          ))}
        </SortableContext>

        <UncategorizedSection
          links={uncategorized}
          intervalMs={intervalMs}
          onEditLink={(link) => setModal({ type: "edit-link", link })}
          onDeleteLink={handleDeleteLink}
        />

        <DragOverlay dropAnimation={null}>
          {activeLink ? (
            <div className="shadow-2xl ring-2 ring-indigo-400 rounded-2xl">
              <LinkCard
                link={activeLink}
                tooltip={false}
                intervalMs={intervalMs}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4">
        <button
          onClick={() => setModal({ type: "create-link", categoryId: null })}
          className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          + Add uncategorized link
        </button>
      </div>

      {/* Modals */}
      {modal.type !== "none" && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal({ type: "none" });
          }}
        >
          <div className="bg-white dark:bg-gray-800 retro:bg-retro-surface retro:border retro:border-retro-dim retro:rounded-none rounded-2xl shadow-xl p-6 w-full max-w-md">
            {modal.type === "create-category" && (
              <>
                <h3 className="text-lg font-semibold mb-4">New Category</h3>
                <AdminCategoryForm
                  existingNames={allCategories.map((c) => c.name)}
                  onSubmit={handleCreateCategory}
                  onCancel={() => setModal({ type: "none" })}
                />
              </>
            )}
            {modal.type === "edit-category" && (
              <>
                <h3 className="text-lg font-semibold mb-4">Rename Category</h3>
                <AdminCategoryForm
                  initialName={modal.category.name}
                  existingNames={allCategories.map((c) => c.name)}
                  onSubmit={(data) =>
                    handleUpdateCategory(modal.category.id, data)
                  }
                  onCancel={() => setModal({ type: "none" })}
                />
              </>
            )}
            {modal.type === "create-link" && (
              <>
                <h3 className="text-lg font-semibold mb-4">New Link</h3>
                <AdminLinkForm
                  categories={allCategories}
                  initialValues={
                    modal.categoryId !== null
                      ? {
                          name: "",
                          url: "",
                          icon_type: "builtin",
                          icon_value: null,
                          category_id: modal.categoryId,
                        }
                      : undefined
                  }
                  onSubmit={handleCreateLink}
                  onCancel={() => setModal({ type: "none" })}
                />
              </>
            )}
            {modal.type === "edit-link" && (
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
                  onSubmit={(data) => handleUpdateLink(modal.link.id, data)}
                  onCancel={() => setModal({ type: "none" })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface UncategorizedSectionProps {
  links: Link[];
  intervalMs: number | null;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: number) => void;
}

function UncategorizedSection({
  links,
  intervalMs,
  onEditLink,
  onDeleteLink,
}: UncategorizedSectionProps) {
  const containerId = linkContainerId(null);
  const { setNodeRef } = useDroppable({
    id: containerId,
    data: { type: "link-container", categoryId: null },
  });

  if (links.length === 0) return null;

  return (
    <section className="mb-8 md:mb-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Uncategorized
        </h3>
      </div>
      <SortableContext
        id={UNCATEGORIZED_LINK_CONTAINER}
        items={links.map((l) => l.id)}
        strategy={rectSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4"
        >
          {links.map((link) => (
            <SortableLinkCard
              key={link.id}
              link={link}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
              intervalMs={intervalMs}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
