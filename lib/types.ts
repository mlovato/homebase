export type IconType = 'builtin' | 'upload' | 'url'

export type HealthCheckInterval = '10s' | '30s' | '60s' | 'never'

export const HEALTH_CHECK_INTERVALS: HealthCheckInterval[] = ['10s', '30s', '60s', 'never']

export const INTERVAL_TO_MS: Record<HealthCheckInterval, number | null> = {
  '10s': 10000,
  '30s': 30000,
  '60s': 60000,
  'never': null,
}

export const DEFAULT_HEALTH_CHECK_INTERVAL: HealthCheckInterval = '30s'

export interface Category {
  id: number
  name: string
  sort_order: number
}

export interface Link {
  id: number
  category_id: number | null
  name: string
  url: string
  icon_type: IconType
  icon_value: string | null
  sort_order: number
}

export interface CategoryWithLinks extends Category {
  links: Link[]
}

export interface CreateCategoryInput {
  name: string
  sort_order?: number
}

export interface UpdateCategoryInput {
  name?: string
  sort_order?: number
}

export interface CreateLinkInput {
  category_id?: number | null
  name: string
  url: string
  icon_type: IconType
  icon_value?: string | null
  sort_order?: number
}

export interface UpdateLinkInput {
  category_id?: number | null
  name?: string
  url?: string
  icon_type?: IconType
  icon_value?: string | null
  sort_order?: number
}
