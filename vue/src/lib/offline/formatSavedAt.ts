/** "14:32" for today, "3 Sep, 14:32" otherwise - when the offline copy was last current. */
export function formatSavedAt(ms: number | null | undefined, now = new Date()): string {
  if (ms == null) return ''
  const at = new Date(ms)
  const sameDay = at.toDateString() === now.toDateString()
  return at.toLocaleString(
    [],
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  )
}
