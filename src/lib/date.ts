export const CT_TZ = 'America/Chicago'

/**
 * Returns today's date as 'YYYY-MM-DD' in Central Time.
 * Safe to call on server (UTC) or client.
 */
export function todayKeyCT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CT_TZ })
}

/**
 * Returns a Date object representing midnight of today in Central Time,
 * expressed as a local Date (for use with date-fns differenceInDays).
 */
export function startOfDayCT(): Date {
  const [y, m, d] = todayKeyCT().split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a date-only ISO string ('2026-04-15') as 'Apr 15, 2026'.
 * Date-only strings are timezone-neutral — no conversion needed.
 */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a UTC timestamp ISO string as 'Mar 22, 2026 · 2:30 PM' in Central Time.
 * Use this for all timestamptz columns (created_at, scheduled_at, responded_at, etc.)
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('en-US', {
    timeZone: CT_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('en-US', {
    timeZone: CT_TZ,
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} · ${timePart}`
}
