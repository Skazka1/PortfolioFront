/** Плоский текст для превью карточек (без тегов и лишних пробелов). */
export function stripHtmlToPlain(html: string): string {
  if (!html) {
    return ''
  }
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, ' ')
  return stripped.replace(/\s+/g, ' ').trim()
}
