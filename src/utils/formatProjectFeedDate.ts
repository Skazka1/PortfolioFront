import type { ProjectPastEvent } from '@/types/api'

/** Дата создания проекта для подписи в ленте (русская локаль). */
export function formatProjectFeedCreatedAt(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** Одна строка про связанное прошедшее событие (лента, карточки). */
export function formatPastEventShort(ev: ProjectPastEvent): string {
  const when = formatProjectFeedCreatedAt(ev.date_time)
  const genre =
    ev.genres?.length ? ` · ${ev.genres.join(', ')}` : ''
  return when ? `${ev.title} (${when})${genre}` : `${ev.title}${genre}`
}
