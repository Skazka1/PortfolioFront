/**
 * datetime-local даёт «настенное» время без часового пояса (2026-05-20T14:30).
 * toISOString() переводит в UTC и сдвигает часы — для событий это не нужно.
 */

/** Значение input datetime-local → строка для API (Y-m-d H:i:s). */
export function datetimeLocalToPayload(value: string): string {
  const v = value.trim()
  if (!v) {
    return ''
  }
  const [datePart, timePart] = v.split('T')
  if (!datePart || !timePart) {
    return v
  }
  const [hh, mm] = timePart.split(':')
  return `${datePart} ${hh}:${mm ?? '00'}:00`
}

/** ISO с сервера → значение для datetime-local в локальном времени браузера. */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
