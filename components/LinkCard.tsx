'use client'

import type { Link } from '@/lib/types'

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg'

function IconDisplay({ link }: { link: Link }) {
  const initial = link.name.charAt(0).toUpperCase()

  if (link.icon_type === 'builtin' && link.icon_value) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${CDN_BASE}/${link.icon_value}.svg`}
        alt={link.name}
        className="w-12 h-12 object-contain"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
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
