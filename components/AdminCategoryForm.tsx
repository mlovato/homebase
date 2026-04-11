"use client";

import { useState } from "react";

interface AdminCategoryFormProps {
  initialName?: string;
  existingNames?: string[];
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
}

export function AdminCategoryForm({
  initialName,
  existingNames = [],
  onSubmit,
  onCancel,
}: AdminCategoryFormProps) {
  const [name, setName] = useState(initialName ?? "");
  const isEdit = initialName !== undefined;

  const isDuplicate =
    name.trim() !== "" &&
    existingNames.some(
      (existing) =>
        existing.toLowerCase() === name.trim().toLowerCase() &&
        (!isEdit || existing.toLowerCase() !== initialName!.toLowerCase()),
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() && !isDuplicate) {
      onSubmit({ name: name.trim() });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="category-name"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Media, Monitoring, Tools"
          required
          autoFocus
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {isDuplicate && (
          <p className="text-sm text-red-500">
            A category with the same name already exists
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {isEdit ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}
