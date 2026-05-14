export type UserRole = 'admin' | 'teacher' | 'student'

export interface User {
  id: number
  name: string
  email?: string
  role: UserRole
  course: string | null
  group: string | null
  avatar_url: string | null
  bio?: string | null
  is_active: boolean
}

export interface TeacherBrief {
  id: number
  name: string
}

/** Автор проекта (карточки) в API; у студентов в ленте совпадает с кратким профилем + `role`. */
export interface ProjectCreatedBy {
  id: number
  name: string
  course: string | null
  group: string | null
  avatar_url: string | null
  bio?: string | null
  role: UserRole
}

/** Прошедшее кампусное событие, к которому привязан проект. */
export interface ProjectPastEvent {
  id: number
  title: string
  date_time: string
  genres: string[]
  location: string | null
}

export interface Project {
  id: number
  title: string
  description: string
  github_url: string | null
  preview_image_url: string | null
  gallery_urls?: string[]
  /** Жанры мероприятия (научное, спортивное, …); в API ключ `technologies`. */
  technologies: string[]
  is_published: boolean
  likes_count: number
  liked_by_me: boolean
  /** ISO 8601 из API */
  created_at?: string | null
  created_by?: ProjectCreatedBy | null
  past_event?: ProjectPastEvent | null
  students?: User[]
  supervisor?: TeacherBrief | null
}

export interface StudentCard {
  id: number
  name: string
  course: string | null
  group: string | null
  avatar_url: string | null
  last_projects: ProjectPreview[]
}

export interface ProjectPreview {
  id: number
  title: string
  preview_image_url: string | null
  /** Жанры мероприятия; ключ API `technologies`. */
  technologies: string[]
}

export interface CampusEvent {
  id: number
  title: string
  description: string | null
  date_time: string
  location: string | null
  /** Жанры мероприятия (из общего списка). */
  genres: string[]
  created_by?: User
}

export interface Paginated<T> {
  data: T[]
  links: { url: string | null; label: string; active: boolean }[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
