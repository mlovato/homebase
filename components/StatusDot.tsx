'use client'

import { useState, useEffect } from 'react'

type HealthStatus = 'up' | 'down' | 'unknown'

const COLORS: Record<HealthStatus, string> = {
  up: 'bg-green-400',
  down: 'bg-red-400',
  unknown: 'bg-gray-400',
}

const LABELS: Record<HealthStatus, string> = {
  up: 'online',
  down: 'offline',
  unknown: 'checking',
}

interface StatusDotProps {
  url: string
}

export function StatusDot({ url }: StatusDotProps) {
  const [status, setStatus] = useState<HealthStatus>('unknown')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/health?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setStatus(data.status ?? 'unknown') })
      .catch(() => { if (!cancelled) setStatus('down') })
    return () => { cancelled = true }
  }, [url])

  return (
    <span
      role="status"
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${COLORS[status]} ring-2 ring-white dark:ring-gray-800 retro:ring-retro-surface`}
    />
  )
}
