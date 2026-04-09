'use client'

import { useState, useRef, useEffect } from 'react'
import { useIconSearch } from '@/lib/hooks/useIconSearch'
import type { IconType } from '@/lib/types'
import { DASHBOARD_ICONS_CDN } from '@/lib/constants'

export interface IconPickerValue {
  icon_type: IconType
  icon_value: string | null
}

interface IconPickerProps {
  value: IconPickerValue
  onChange: (value: IconPickerValue) => void
  serviceName: string
}

type Tab = 'builtin' | 'upload' | 'url'

export function IconPicker({ value, onChange, serviceName }: IconPickerProps) {
  const [tab, setTab] = useState<Tab>(value.icon_type)
  const [slug, setSlug] = useState(value.icon_type === 'builtin' ? (value.icon_value ?? '') : '')
  const [urlValue, setUrlValue] = useState(value.icon_type === 'url' ? (value.icon_value ?? '') : '')
  const [uploadPath, setUploadPath] = useState<string | null>(
    value.icon_type === 'upload' ? value.icon_value : null
  )
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [userEdited, setUserEdited] = useState(!!value.icon_value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { suggestions } = useIconSearch(searchQuery)

  // Auto-suggest from service name when user hasn't manually picked an icon
  useEffect(() => {
    if (userEdited || tab !== 'builtin' || !serviceName.trim()) return
    setSearchQuery(serviceName)
  }, [serviceName, userEdited, tab])

  // Auto-select first suggestion from service name auto-search
  useEffect(() => {
    if (userEdited || tab !== 'builtin') return
    if (suggestions.length > 0) {
      setSlug(suggestions[0].slug)
      onChange({ icon_type: 'builtin', icon_value: suggestions[0].slug })
    }
  }, [suggestions, userEdited, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSlugChange(newSlug: string) {
    setSlug(newSlug)
    setSearchQuery(newSlug)
    setUserEdited(true)
    onChange({ icon_type: 'builtin', icon_value: newSlug.trim() || null })
    setSuggestionsOpen(true)
  }

  function selectSuggestion(selectedSlug: string) {
    setSlug(selectedSlug)
    setSearchQuery('')
    setUserEdited(true)
    setSuggestionsOpen(false)
    onChange({ icon_type: 'builtin', icon_value: selectedSlug })
  }

  function switchTab(newTab: Tab) {
    setTab(newTab)
    if (newTab === 'builtin') onChange({ icon_type: 'builtin', icon_value: slug.trim() || null })
    if (newTab === 'upload') onChange({ icon_type: 'upload', icon_value: uploadPath })
    if (newTab === 'url') onChange({ icon_type: 'url', icon_value: urlValue.trim() || null })
    setUserEdited(true)
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
        onChange({ icon_type: 'upload', icon_value: data.path })
      } else {
        alert(data.error ?? 'Upload failed')
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      tab === t
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon</span>

      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 w-fit">
        <button type="button" className={tabClass('builtin')} onClick={() => switchTab('builtin')}>Built-in</button>
        <button type="button" className={tabClass('upload')} onClick={() => switchTab('upload')}>Upload</button>
        <button type="button" className={tabClass('url')} onClick={() => switchTab('url')}>URL</button>
      </div>

      {tab === 'builtin' && (
        <div className="flex flex-col gap-2">
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              placeholder="Search icon (e.g. plex, sonarr, grafana)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map(result => (
                  <button
                    key={result.slug}
                    type="button"
                    onMouseDown={() => selectSuggestion(result.slug)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <img src={result.url} alt={result.slug} className="w-6 h-6 object-contain shrink-0" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{result.name}</span>
                    <span className="text-xs text-gray-400 ml-auto font-mono">{result.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 min-h-[52px]">
            {slug.trim() ? (
              <>
                <img
                  src={`${DASHBOARD_ICONS_CDN}/${slug.trim()}.svg`}
                  alt={slug}
                  className="w-8 h-8 object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{slug.trim()}</span>
                <a
                  href={`https://dashboardicons.com/icons?search=${slug}`}
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

      {tab === 'upload' && (
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

      {tab === 'url' && (
        <input
          type="url"
          value={urlValue}
          onChange={e => {
            setUrlValue(e.target.value)
            onChange({ icon_type: 'url', icon_value: e.target.value.trim() || null })
          }}
          placeholder="https://example.com/icon.png"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
    </div>
  )
}
