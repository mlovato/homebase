'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { HealthStatus } from '@/app/api/health/handler'

type StatusMap = Record<string, HealthStatus>

export const HealthCheckContext = createContext<StatusMap>({})

export function useHealthStatus(url: string): HealthStatus {
  return useContext(HealthCheckContext)[url] ?? 'unknown'
}

interface HealthCheckProviderProps {
  urls: string[]
  intervalMs: number | null
  children: React.ReactNode
}

export function HealthCheckProvider({ urls, intervalMs, children }: HealthCheckProviderProps) {
  const [statuses, setStatuses] = useState<StatusMap>({})
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const urlsKey = JSON.stringify(urls)

  useEffect(() => {
    if (urls.length === 0 || intervalMs === null) return

    let cancelled = false

    const check = () => {
      xhrRef.current?.abort()
      const params = new URLSearchParams()
      urls.forEach(url => params.append('url', url))
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr
      xhr.open('GET', `/api/health/batch?${params}`)
      xhr.onload = () => {
        if (cancelled) return
        try {
          const next = JSON.parse(xhr.responseText) as StatusMap
          setStatuses(prev => {
            const keys = Object.keys(next)
            if (keys.length === Object.keys(prev).length && keys.every(k => prev[k] === next[k])) return prev
            return next
          })
        } catch {}
      }
      xhr.send()
    }

    check()
    const id = setInterval(check, intervalMs)
    return () => {
      cancelled = true
      xhrRef.current?.abort()
      clearInterval(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, intervalMs])

  return (
    <HealthCheckContext.Provider value={statuses}>
      {children}
    </HealthCheckContext.Provider>
  )
}
