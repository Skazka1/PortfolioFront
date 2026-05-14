/** Синхронно с `backend/config/portfolio.php` → `event_genres`. */
export const EVENT_GENRES = [
  'научное',
  'спортивное',
  'волонтерское',
  'развлекательное',
  'праздничное',
  'культурно-просветительное',
  'олимпиада',
  'конкурс',
] as const

export type EventGenre = (typeof EVENT_GENRES)[number]
