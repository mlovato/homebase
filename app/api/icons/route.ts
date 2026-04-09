import { NextRequest, NextResponse } from 'next/server'

const METADATA_URL = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/meta/metadata.json'
export const CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg'

interface RawMeta {
  aliases?: string[]
}

interface IconEntry {
  slug: string
  name: string
  aliases: string[]
}

let cache: IconEntry[] | null = null

async function getIcons(): Promise<IconEntry[]> {
  if (cache) return cache
  const res = await fetch(METADATA_URL, { next: { revalidate: 86400 } })
  const raw: Record<string, RawMeta> = await res.json()
  cache = Object.entries(raw).map(([slug, meta]) => ({
    slug,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    aliases: meta.aliases ?? [],
  }))
  return cache
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const icons = await getIcons()
  const results = icons
    .filter(icon =>
      icon.slug.includes(q) ||
      icon.name.toLowerCase().includes(q) ||
      icon.aliases.some(a => a.toLowerCase().includes(q))
    )
    .slice(0, 8)
    .map(({ slug, name }) => ({ slug, name, url: `${CDN_BASE}/${slug}.svg` }))

  return NextResponse.json({ results })
}
