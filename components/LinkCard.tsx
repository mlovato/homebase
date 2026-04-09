'use client'

import type { Link } from '@/lib/types'

interface SimpleIcon {
  title: string
  hex: string
  path: string
}

function getBuiltinIcon(slug: string): SimpleIcon | null {
  try {
    // Dynamic require to keep component testable without ESM issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icons = require('simple-icons')
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`
    return (icons[key] as SimpleIcon) ?? null
  } catch {
    return null
  }
}

function IconDisplay({ link }: { link: Link }) {
  const initial = link.name.charAt(0).toUpperCase()

  if (link.icon_type === 'builtin' && link.icon_value) {
    const icon = getBuiltinIcon(link.icon_value)
    if (icon) {
      return (
        <svg
          role="img"
          viewBox="0 0 24 24"
          className="w-12 h-12"
          fill={`#${icon.hex}`}
          aria-label={link.name}
        >
          <path d={icon.path} />
        </svg>
      )
    }
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

  // Fallback: letter avatar
  return (
    <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold select-none">
      {initial}
    </div>
  )
}

interface LinkCardProps {
  link: Link
}

export function LinkCard({ link }: LinkCardProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-gray-800 shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <IconDisplay link={link} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-center leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        {link.name}
      </span>
    </a>
  )
}
