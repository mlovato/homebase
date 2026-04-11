"use client";

import type {
  CategoryWithLinks,
  Link,
  Category,
  CreateLinkInput,
  UpdateLinkInput,
} from "@/lib/types";
import { AdminCategoryForm } from "@/components/AdminCategoryForm";
import { AdminLinkForm } from "@/components/AdminLinkForm";
import { SortableLinkCard } from "@/components/SortableLinkCard";
import { SortableCategorySection } from "@/components/SortableCategorySection";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

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
  handleDeleteCategory: (id: number) => Promise<void>;
  handleCreateLink: (data: CreateLinkInput) => Promise<void>;
  handleUpdateLink: (
    id: number,
    data: Partial<UpdateLinkInput>,
  ) => Promise<void>;
  handleDeleteLink: (id: number) => Promise<void>;
  handleDragEnd: (
    event: DragEndEvent,
    categoryId: number | null,
  ) => Promise<void>;
  handleCategoryDragEnd: (event: DragEndEvent) => Promise<void>;
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
  handleCategoryDragEnd,
  intervalMs,
}: LinksTabProps) {
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
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableCategorySection
              key={category.id}
              category={category}
              sensors={sensors}
              onAddLink={(id) =>
                setModal({ type: "create-link", categoryId: id })
              }
              onEditCategory={(cat) =>
                setModal({ type: "edit-category", category: cat })
              }
              onDeleteCategory={handleDeleteCategory}
              onEditLink={(link) => setModal({ type: "edit-link", link })}
              onDeleteLink={handleDeleteLink}
              onLinkDragEnd={handleDragEnd}
              intervalMs={intervalMs}
            />
          ))}
        </SortableContext>
      </DndContext>

      {uncategorized.length > 0 && (
        <section className="mb-8 md:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Uncategorized
            </h3>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => handleDragEnd(e, null)}
          >
            <SortableContext
              items={uncategorized.map((l) => l.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {uncategorized.map((link) => (
                  <SortableLinkCard
                    key={link.id}
                    link={link}
                    onEdit={(l) => setModal({ type: "edit-link", link: l })}
                    onDelete={handleDeleteLink}
                    intervalMs={intervalMs}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}

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
