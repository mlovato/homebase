'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { HealthStatus } from '@/app/api/health/handler'

type StatusMap = Record<string, HealthStatus>

export const HealthCheckContext = createContext<StatusMap>({})

export function useHealthStatus(url: string): HealthStatus {
  return useContext(HealthCheckContext)[url] ?? 'unknown'
}

export async function checkHealthClient(
  url: string
): Promise<HealthStatus> {
  if (!url) return 'unknown'
  if (!url.startsWith('http://') && !url.startsWith('https://')) return 'unknown'

  try {
    const res = await fetch(`/api/health?url=${encodeURIComponent(url)}`)
    const data = await res.json()
    return data.status as HealthStatus
  } catch {
    return 'down'
  }
}

export type Checker = (url: string) => Promise<HealthStatus>

interface HealthCheckProviderProps {
  urls: string[]
  intervalMs: number | null
  checker?: Checker
  children: React.ReactNode
}

export function HealthCheckProvider({
  urls,
  intervalMs,
  checker = checkHealthClient,
  children,
}: HealthCheckProviderProps) {
  const [statuses, setStatuses] = useState<StatusMap>({})
  const checkerRef = useRef(checker)
  checkerRef.current = checker
  const urlsKey = JSON.stringify(urls)

  useEffect(() => {
    if (urls.length === 0 || intervalMs === null) return

    let cycleId = 0
    let timeoutId: ReturnType<typeof setTimeout>

    const check = async () => {
      const id = ++cycleId
      const entries = await Promise.all(
        urls.map(async url => [url, await checkerRef.current(url)] as const)
      )
      if (id !== cycleId) return
      const next = Object.fromEntries(entries) as StatusMap
      setStatuses(prev => {
        const keys = Object.keys(next)
        if (keys.length === Object.keys(prev).length && keys.every(k => prev[k] === next[k])) return prev
        return next
      })
      timeoutId = setTimeout(check, intervalMs)
    }

    check()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        clearTimeout(timeoutId)
        check()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cycleId++
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, intervalMs])

  return (
    <HealthCheckContext.Provider value={statuses}>
      {children}
    </HealthCheckContext.Provider>
  )
}
