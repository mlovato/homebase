import type { CategoryWithLinks } from '@/lib/types'
import { LinkCard } from './LinkCard'

interface CategorySectionProps {
  category: CategoryWithLinks
}

export function CategorySection({ category }: CategorySectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">
        {category.name}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {category.links.map(link => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  )
}
