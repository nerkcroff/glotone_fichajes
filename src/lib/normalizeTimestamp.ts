/**
 * Normalizes an ISO 8601 timestamp string to ensure consistent fractional seconds.
 *
 * Python's datetime.fromisoformat() (< 3.11) only accepts 0, 3, or 6 fractional
 * digits. Firestore may return timestamps with irregular fractional digits (e.g., 5)
 * when trailing zeros are stripped. This function parses the timestamp with
 * JavaScript's Date (which is lenient) and re-formats it to a consistent ISO string.
 *
 * Input:  '2026-02-11T15:12:29.12546+00:00'  (5 fractional digits - breaks Python)
 * Output: '2026-02-11T15:12:29.125000+00:00'  (6 fractional digits - Python-safe)
 */
export function normalizeTimestamp(isoString: string | null | undefined): string | null {
  if (!isoString) return null

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString as string

    // Build ISO string with exactly 6 fractional digits (microsecond precision)
    // and +00:00 offset to match Python's expected format
    const pad = (n: number, len: number = 2) => String(n).padStart(len, '0')

    const year = date.getUTCFullYear()
    const month = pad(date.getUTCMonth() + 1)
    const day = pad(date.getUTCDate())
    const hours = pad(date.getUTCHours())
    const minutes = pad(date.getUTCMinutes())
    const seconds = pad(date.getUTCSeconds())
    const ms = pad(date.getUTCMilliseconds(), 3)

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}000+00:00`
  } catch {
    return isoString as string
  }
}
