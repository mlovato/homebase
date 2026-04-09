export type IconType = 'builtin' | 'upload' | 'url'

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
