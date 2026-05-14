import type { Project, ProjectCreatedBy, UserRole } from '@/types/api'

/** Поля, нужные чтобы показать автора и ссылку на профиль (если это студент). */
export interface DisplayProjectCreator {
  id: number
  name: string
  avatar_url: string | null
  role: UserRole
}

function fromPayload(c: ProjectCreatedBy): DisplayProjectCreator {
  return {
    id: c.id,
    name: c.name,
    avatar_url: c.avatar_url,
    role: c.role,
  }
}

/** Автор карточки: явное поле API или первый участник для старых записей. */
export function displayProjectCreator(p: Project): DisplayProjectCreator | null {
  if (p.created_by) {
    return fromPayload(p.created_by)
  }
  const s = p.students?.[0]
  if (!s) {
    return null
  }
  return {
    id: s.id,
    name: s.name,
    avatar_url: s.avatar_url,
    role: s.role,
  }
}
