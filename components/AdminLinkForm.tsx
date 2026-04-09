'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

interface IconResult {
  slug: string
  name: string
  url: string
}

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg'

export function AdminLinkForm({ categories, initialValues, onSubmit, onCancel }: AdminLinkFormProps) {
  const isEdit = !!(initialValues?.name)
  const [name, setName] = useState(initialValues?.name ?? '')
  const [url, setUrl] = useState(initialValues?.url ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.category_id ?? null)
  const [iconTab, setIconTab] = useState<IconTab>(initialValues?.icon_type ?? 'builtin')
  const [iconSlug, setIconSlug] = useState(
    initialValues?.icon_type === 'builtin' ? (initialValues.icon_value ?? '') : ''
  )
  const [iconUrl, setIconUrl] = useState(
    initialValues?.icon_type === 'url' ? (initialValues.icon_value ?? '') : ''
  )
  const [uploadPath, setUploadPath] = useState<string | null>(
    initialValues?.icon_type === 'upload' ? initialValues.icon_value : null
  )
  const [uploading, setUploading] = useState(false)
  const [iconUserEdited, setIconUserEdited] = useState(isEdit)
  const [suggestions, setSuggestions] = useState<IconResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [autoLabel, setAutoLabel] = useState<string | null>(
    isEdit && initialValues?.icon_type === 'builtin' && initialValues.icon_value ? null : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const searchIcons = useCallback(async (q: string): Promise<IconResult[]> => {
    if (q.length < 2) return []
    const res = await fetch(`/api/icons?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNameChange(newName: string) {
    setName(newName)
    if (iconUserEdited || iconTab !== 'builtin') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await searchIcons(newName)
      if (results.length > 0 && !iconUserEdited) {
        setIconSlug(results[0].slug)
        setAutoLabel(results[0].name)
        setSuggestions(results)
      } else {
        setIconSlug('')
        setAutoLabel(null)
        setSuggestions([])
      }
    }, 400)
  }

  function handleSlugChange(value: string) {
    setIconSlug(value)
    setIconUserEdited(true)
    setAutoLabel(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setSuggestions([]); setSuggestionsOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      const results = await searchIcons(value)
      setSuggestions(results)
      setSuggestionsOpen(results.length > 0)
    }, 300)
  }

  function selectSuggestion(result: IconResult) {
    setIconSlug(result.slug)
    setAutoLabel(null)
    setIconUserEdited(true)
    setSuggestionsOpen(false)
    setSuggestions([])
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
      if (res.ok) setUploadPath(data.path)
      else alert(data.error ?? 'Upload failed')
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return

    const icon_type = iconTab
    const icon_value =
      iconTab === 'builtin' ? (iconSlug.trim() || null) :
      iconTab === 'upload' ? uploadPath :
      (iconUrl.trim() || null)

    onSubmit({ name: name.trim(), url: url.trim(), icon_type, icon_value, category_id: categoryId })
  }

  const tabClass = (tab: IconTab) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      iconTab === tab
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="link-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
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
        <label htmlFor="link-url" className="text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
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
        <label htmlFor="link-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <select
          id="link-category"
          value={categoryId ?? ''}
          onChange={e => setCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— No category —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Icon */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon</span>
        <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 w-fit">
          <button type="button" className={tabClass('builtin')} onClick={() => setIconTab('builtin')}>Built-in</button>
          <button type="button" className={tabClass('upload')} onClick={() => { setIconTab('upload'); setIconUserEdited(true) }}>Upload</button>
          <button type="button" className={tabClass('url')} onClick={() => { setIconTab('url'); setIconUserEdited(true) }}>URL</button>
        </div>

        {iconTab === 'builtin' && (
          <div className="flex flex-col gap-2">
            {/* Search input + dropdown */}
            <div className="relative" ref={suggestionsRef}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={iconSlug}
                  onChange={e => handleSlugChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                  placeholder="Search icon (e.g. plex, sonarr, grafana)"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {autoLabel && (
                  <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    auto
                  </span>
                )}
              </div>

              {suggestionsOpen && suggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(result => (
                    <button
                      key={result.slug}
                      type="button"
                      onMouseDown={() => selectSuggestion(result)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <img src={result.url} alt={result.name} className="w-6 h-6 object-contain shrink-0" />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{result.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto font-mono">{result.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 min-h-[52px]">
              {iconSlug.trim() ? (
                <>
                  <img
                    src={`${CDN_BASE}/${iconSlug.trim()}.svg`}
                    alt={iconSlug}
                    className="w-8 h-8 object-contain shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{iconSlug.trim()}</span>
                  <a
                    href={`https://dashboardicons.com/icons?search=${iconSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-indigo-500 hover:underline"
                  >
                    browse
                  </a>
                </>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">Icon preview — type a name above or search</span>
              )}
            </div>
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
            {uploadPath && <span className="text-xs text-green-600 dark:text-green-400">Uploaded: {uploadPath}</span>}
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
