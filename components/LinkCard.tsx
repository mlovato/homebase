'use client'

import { useState } from 'react'
import type { Link } from '@/lib/types'
import { DASHBOARD_ICONS_CDN } from '@/lib/constants'

// Tries base slug → -light variant → -dark variant → letter avatar
function BuiltinIcon({ slug, name }: { slug: string; name: string }) {
  const variants = [`${slug}.svg`, `${slug}-light.svg`, `${slug}-dark.svg`]
  const [attempt, setAttempt] = useState(0)
  const initial = name.charAt(0).toUpperCase()

  if (attempt >= variants.length) {
    return (
      <div className="w-12 h-12 rounded-full retro:rounded-none bg-indigo-500 retro:bg-transparent retro:border retro:border-retro-green flex items-center justify-center text-white retro:text-retro-green text-xl font-bold select-none">
        {initial}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${DASHBOARD_ICONS_CDN}/${variants[attempt]}`}
      alt={name}
      className="w-12 h-12 object-contain"
      onError={() => setAttempt(a => a + 1)}
    />
  )
}

function IconDisplay({ link }: { link: Link }) {
  if (link.icon_type === 'builtin' && link.icon_value) {
    return <BuiltinIcon slug={link.icon_value} name={link.name} />
  }

  if ((link.icon_type === 'upload' || link.icon_type === 'url') && link.icon_value) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={link.icon_value}
        alt={link.name}
        className="w-12 h-12 object-contain"
      />
    )
  }

  const initial = link.name.charAt(0).toUpperCase()
  return (
    <div className="w-12 h-12 rounded-full retro:rounded-none bg-indigo-500 retro:bg-transparent retro:border retro:border-retro-green flex items-center justify-center text-white retro:text-retro-green text-xl font-bold select-none">
      {initial}
    </div>
  )
}

interface LinkCardProps {
  link: Link
  tooltip?: boolean
}

export function LinkCard({ link, tooltip = true }: LinkCardProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip ? link.name : undefined}
      className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white dark:bg-gray-800 retro:bg-retro-surface retro:rounded-none retro:border retro:border-retro-dim retro:shadow-none retro:hover:border-retro-green shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group h-32 w-full"
    >
      <IconDisplay link={link} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 retro:text-retro-green text-center leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 retro:group-hover:text-retro-green w-full truncate px-1">
        {link.name}
      </span>
    </a>
  )
}
