'use client'

import { useState, useEffect } from 'react'

export interface IconResult {
  slug: string
  name: string
  url: string
}

export function useIconSearch(query: string): { suggestions: IconResult[] } {
  const [suggestions, setSuggestions] = useState<IconResult[]>([])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/icons?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(data.results ?? [])
      } catch {
        // network errors are non-fatal
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  return { suggestions }
}
