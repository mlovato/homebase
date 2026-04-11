"use client";

import { useState } from "react";
import { IconPicker, type IconPickerValue } from "./IconPicker";
import type { Category, IconType } from "@/lib/types";

interface InitialValues {
  name: string;
  url: string;
  icon_type: IconType;
  icon_value: string | null;
  category_id: number | null;
}

interface AdminLinkFormProps {
  categories: Category[];
  initialValues?: InitialValues;
  onSubmit: (data: {
    name: string;
    url: string;
    icon_type: IconType;
    icon_value: string | null;
    category_id: number | null;
  }) => void;
  onCancel: () => void;
}

export function AdminLinkForm({
  categories,
  initialValues,
  onSubmit,
  onCancel,
}: AdminLinkFormProps) {
  const isEdit = !!initialValues?.name;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    initialValues?.category_id ?? null,
  );
  const [icon, setIcon] = useState<IconPickerValue>({
    icon_type: initialValues?.icon_type ?? "builtin",
    icon_value: initialValues?.icon_value ?? null,
  });
  const [urlError, setUrlError] = useState("");

  const URL_ERROR = "Please enter a valid URL";

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.hostname.includes(".") || parsed.hostname === "localhost";
    } catch {
      return false;
    }
  }

  function validateUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return isValidUrl(normalizeUrl(trimmed)) ? null : URL_ERROR;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");
    if (!name.trim() || !url.trim()) return;
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }
    onSubmit({
      name: name.trim(),
      url: normalizeUrl(url),
      ...icon,
      category_id: categoryId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-name"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name
        </label>
        <input
          id="link-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Plex"
          required
          autoFocus
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-url"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          URL
        </label>
        <input
          id="link-url"
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError("");
          }}
          onBlur={() => {
            const error = validateUrl(url);
            if (error) setUrlError(error);
          }}
          placeholder="http://localhost:32400"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {urlError && (
          <p className="text-sm text-red-500 dark:text-red-400">{urlError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-category"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Category
        </label>
        <select
          id="link-category"
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— No category —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <IconPicker value={icon} onChange={setIcon} serviceName={name} />

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
