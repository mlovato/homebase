'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { HealthStatus } from '@/app/api/health/handler'

type StatusMap = Record<string, HealthStatus>

export const HealthCheckContext = createContext<StatusMap>({})

export function useHealthStatus(url: string): HealthStatus {
  return useContext(HealthCheckContext)[url] ?? 'unknown'
}

export async function checkHealthClient(
  url: string,
  signal?: AbortSignal
): Promise<HealthStatus> {
  if (!url) return 'unknown'
  if (!url.startsWith('http://') && !url.startsWith('https://')) return 'unknown'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    signal?.addEventListener('abort', () => controller.abort())
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    })
    clearTimeout(timer)
    return 'up'
  } catch {
    return 'down'
  }
}

export type Checker = (url: string, signal?: AbortSignal) => Promise<HealthStatus>

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

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>
    let controller: AbortController

    const check = async () => {
      controller = new AbortController()
      const entries = await Promise.all(
        urls.map(async url => [url, await checkerRef.current(url, controller.signal)] as const)
      )
      if (cancelled) return
      const next = Object.fromEntries(entries) as StatusMap
      setStatuses(prev => {
        const keys = Object.keys(next)
        if (keys.length === Object.keys(prev).length && keys.every(k => prev[k] === next[k])) return prev
        return next
      })
      timeoutId = setTimeout(check, intervalMs)
    }

    const startChecking = () => {
      controller?.abort()
      clearTimeout(timeoutId)
      cancelled = false
      check()
    }

    startChecking()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') startChecking()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      controller?.abort()
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
