import { getDb } from '@/lib/db'
import { getCategoriesWithLinks, getUncategorizedLinks } from '@/lib/repositories/categories'
import { getHealthCheckInterval, getSearchShortcut } from '@/lib/repositories/settings'
import { INTERVAL_TO_MS } from '@/lib/types'
import { CategorySection } from '@/components/CategorySection'
import { LinkCard } from '@/components/LinkCard'
import { HealthCheckProvider } from '@/components/HealthCheckContext'
import { SearchModal } from '@/components/SearchModal'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const db = getDb()
  const categories = getCategoriesWithLinks(db)
  const uncategorized = getUncategorizedLinks(db)
  const intervalMs = INTERVAL_TO_MS[getHealthCheckInterval(db)]
  const searchShortcut = getSearchShortcut(db)

  const allUrls = [
    ...categories.flatMap(c => c.links.map(l => l.url)),
    ...uncategorized.map(l => l.url),
  ]

  const hasContent = categories.some(c => c.links.length > 0) || uncategorized.length > 0

  const content = (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 dark:text-gray-500">
          <div className="text-6xl mb-4">🗂️</div>
          <p className="text-xl font-medium mb-2">No links yet</p>
          <p className="text-sm">
            Go to{' '}
            <a href="/admin" className="text-indigo-500 hover:underline">
              Admin
            </a>{' '}
            to add your first link.
          </p>
        </div>
      )}

      {categories
        .filter(c => c.links.length > 0)
        .map(category => (
          <CategorySection key={category.id} category={category} intervalMs={intervalMs} />
        ))}

      {uncategorized.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4 px-1">
            Other
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {uncategorized.map(link => (
              <LinkCard key={link.id} link={link} intervalMs={intervalMs} />
            ))}
          </div>
        </section>
      )}
    </div>
  )

  const searchLinks = [...categories.flatMap(c => c.links), ...uncategorized]
    .map(({ id, name, url, icon_type, icon_value }) => ({ id, name, url, icon_type, icon_value }))

  return (
    <main className="min-h-screen retro:bg-retro-bg">
      <header className="border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg px-6 py-4 flex items-center justify-between">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Homebase" className="w-10 h-10 object-contain" />
        </h1>
        <a
          href="/admin"
          className="text-sm text-gray-500 dark:text-gray-400 retro:text-retro-dim hover:text-indigo-600 dark:hover:text-indigo-400 retro:hover:text-retro-green transition-colors"
        >
          Admin
        </a>
      </header>

      <SearchModal links={searchLinks} shortcut={searchShortcut} />
      <HealthCheckProvider urls={allUrls} intervalMs={intervalMs}>{content}</HealthCheckProvider>
    </main>
  )
}
