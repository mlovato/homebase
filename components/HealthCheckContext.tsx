'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { HealthStatus } from '@/app/api/health/handler'

type StatusMap = Record<string, HealthStatus>

export const HealthCheckContext = createContext<StatusMap>({})

export function useHealthStatus(url: string): HealthStatus {
  return useContext(HealthCheckContext)[url] ?? 'unknown'
}

interface HealthCheckProviderProps {
  urls: string[]
  intervalMs: number
  children: React.ReactNode
}

export function HealthCheckProvider({ urls, intervalMs, children }: HealthCheckProviderProps) {
  const [statuses, setStatuses] = useState<StatusMap>({})
  const urlsKey = urls.join(',')

  useEffect(() => {
    if (urls.length === 0) return
    let cancelled = false

    const check = () => {
      const params = new URLSearchParams()
      urls.forEach(url => params.append('url', url))
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `/api/health/batch?${params}`)
      xhr.onload = () => {
        if (cancelled) return
        try {
          setStatuses(JSON.parse(xhr.responseText))
        } catch {}
      }
      xhr.send()
    }

    check()
    const id = setInterval(check, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, intervalMs])

  return (
    <HealthCheckContext.Provider value={statuses}>
      {children}
    </HealthCheckContext.Provider>
  )
}
