'use client'

import { useState, useRef } from 'react'
import type { Category, IconType } from '@/lib/types'

interface InitialValues {
  name: string
  url: string
  icon_type: IconType
  icon_value: string | null
  category_id: number | null
}

interface AdminLinkFormProps {
  categories: Category[]
  initialValues?: InitialValues
  onSubmit: (data: {
    name: string
    url: string
    icon_type: IconType
    icon_value: string | null
    category_id: number | null
  }) => void
  onCancel: () => void
}

type IconTab = 'builtin' | 'upload' | 'url'

interface SimpleIcon {
  title: string
  hex: string
  path: string
}

function getBuiltinIcon(slug: string): SimpleIcon | null {
  if (!slug) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icons = require('simple-icons')
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`
    return (icons[key] as SimpleIcon) ?? null
  } catch {
    return null
  }
}

function findIconSlug(name: string): string | null {
  if (!name.trim()) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const icons = require('simple-icons')

  // Try progressively looser normalizations
  const candidates = [
    // exact lowercase
    name.trim().toLowerCase(),
    // no spaces/hyphens/dots/underscores
    name.trim().toLowerCase().replace(/[\s\-_.]/g, ''),
    // alphanumeric only
    name.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
  ]

  for (const slug of candidates) {
    if (!slug) continue
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`
    if (key in icons) return slug
  }
  return null
}

export function AdminLinkForm({ categories, initialValues, onSubmit, onCancel }: AdminLinkFormProps) {
  const isEdit = initialValues !== undefined
  const [name, setName] = useState(initialValues?.name ?? '')
  const [url, setUrl] = useState(initialValues?.url ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.category_id ?? null)
  const [iconTab, setIconTab] = useState<IconTab>(initialValues?.icon_type ?? 'builtin')
  const [serviceSearch, setServiceSearch] = useState(
    initialValues?.icon_type === 'builtin' ? (initialValues.icon_value ?? '') : ''
  )
  const [iconUrl, setIconUrl] = useState(
    initialValues?.icon_type === 'url' ? (initialValues.icon_value ?? '') : ''
  )
  const [uploadPath, setUploadPath] = useState<string | null>(
    initialValues?.icon_type === 'upload' ? initialValues.icon_value : null
  )
  const [uploading, setUploading] = useState(false)
  // True when the user has explicitly edited the icon field (disables auto-suggest)
  const [iconUserEdited, setIconUserEdited] = useState(isEdit)
  const [iconAutoSlug, setIconAutoSlug] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleNameChange(newName: string) {
    setName(newName)
    if (iconUserEdited) return

    const slug = findIconSlug(newName)
    if (slug) {
      setServiceSearch(slug)
      setIconTab('builtin')
      setIconAutoSlug(slug)
    } else {
      setServiceSearch('')
      setIconAutoSlug(null)
    }
  }

  function handleServiceSearchChange(value: string) {
    setServiceSearch(value)
    setIconAutoSlug(null)
    setIconUserEdited(true)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setUploadPath(data.path)
      } else {
        alert(data.error ?? 'Upload failed')
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function resolvedIconValue(): { icon_type: IconType; icon_value: string | null } {
    if (iconTab === 'builtin') return { icon_type: 'builtin', icon_value: serviceSearch.trim() || null }
    if (iconTab === 'upload') return { icon_type: 'upload', icon_value: uploadPath }
    return { icon_type: 'url', icon_value: iconUrl.trim() || null }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    const { icon_type, icon_value } = resolvedIconValue()
    onSubmit({ name: name.trim(), url: url.trim(), icon_type, icon_value, category_id: categoryId })
  }

  const tabClass = (tab: IconTab) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      iconTab === tab
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  const previewIcon = iconTab === 'builtin' ? getBuiltinIcon(serviceSearch.trim()) : null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="link-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input
          id="link-name"
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="e.g. Plex"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="link-url" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          URL
        </label>
        <input
          id="link-url"
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="http://localhost:32400"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="link-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Category
        </label>
        <select
          id="link-category"
          value={categoryId ?? ''}
          onChange={e => setCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— No category —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Icon */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon</span>
        <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 w-fit">
          <button type="button" className={tabClass('builtin')} onClick={() => setIconTab('builtin')}>
            Built-in
          </button>
          <button type="button" className={tabClass('upload')} onClick={() => { setIconTab('upload'); setIconUserEdited(true) }}>
            Upload
          </button>
          <button type="button" className={tabClass('url')} onClick={() => { setIconTab('url'); setIconUserEdited(true) }}>
            URL
          </button>
        </div>

        {iconTab === 'builtin' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={serviceSearch}
                onChange={e => handleServiceSearchChange(e.target.value)}
                placeholder="Service slug (e.g. plex, sonarr, grafana)"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {iconAutoSlug && serviceSearch === iconAutoSlug && (
                <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  auto
                </span>
              )}
            </div>
            {previewIcon ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40">
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="w-8 h-8 shrink-0"
                  fill={`#${previewIcon.hex}`}
                  aria-label={previewIcon.title}
                >
                  <path d={previewIcon.path} />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{previewIcon.title}</span>
              </div>
            ) : serviceSearch.trim() ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No icon found for &ldquo;{serviceSearch.trim()}&rdquo; — check the slug at{' '}
                <a
                  href="https://simpleicons.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  simpleicons.org
                </a>
              </p>
            ) : null}
          </div>
        )}

        {iconTab === 'upload' && (
          <div className="flex flex-col gap-2">
            <label htmlFor="icon-file" className="text-sm text-gray-600 dark:text-gray-400">
              Icon file (PNG, SVG, ICO, WEBP — max 2 MB)
            </label>
            <input
              id="icon-file"
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.svg,.ico,.webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="text-sm text-gray-700 dark:text-gray-300"
            />
            {uploading && <span className="text-xs text-indigo-500">Uploading…</span>}
            {uploadPath && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Uploaded: {uploadPath}
              </span>
            )}
          </div>
        )}

        {iconTab === 'url' && (
          <input
            type="url"
            value={iconUrl}
            onChange={e => setIconUrl(e.target.value)}
            placeholder="https://example.com/icon.png"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
          {isEdit ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}
