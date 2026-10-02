/**
 * Deterministic time and date formatters to eliminate React SSR/client hydration mismatches.
 * Produces identical string output regardless of whether evaluated in Node.js server or client browser.
 */

export function formatTime(isoString?: string | null): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return ''
  return `${formatDate(isoString)} ${formatTime(isoString)}`
}
