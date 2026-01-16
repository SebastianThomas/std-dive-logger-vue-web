// Type for valid duration time components
export type Duration = {
  hours: number
  minutes: number
  seconds: number
}

// Type for parse result - either valid duration or invalid with the input string
export type ParsedDuration = Duration | { invalid: true; input: string }

// Extract ISO duration string to numbers
export function parseISODuration(duration?: string): ParsedDuration {
  if (!duration) return { hours: 0, minutes: 0, seconds: 0 }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return { invalid: true, input: duration }

  return {
    hours: Number(match[1] ?? 0),
    minutes: Number(match[2] ?? 0),
    seconds: Number(match[3] ?? 0),
  }
}

// Format numbers to human-readable string
export function showDuration(time: Duration): string {
  const parts: string[] = []
  if (time.hours > 0) parts.push(`${time.hours}h`)
  if (time.minutes > 0) parts.push(`${time.minutes}m`)
  if (time.seconds > 0 || parts.length === 0) parts.push(`${time.seconds}s`)
  return parts.join(' ')
}

/**
 * Converts ISO 8601 duration string (PT format) to formatted time string.
 * Returns HH:MM:SS for durations > 100 minutes, or MM:SS for shorter durations.
 * @param duration ISO 8601 duration string (e.g., "PT1H30M45S", "PT30M", "PT45S")
 * @returns Formatted time string (e.g., "01:30:45", "30:45") or "-" if invalid/empty
 */
export function formatISoDurationToTime(duration?: string | null): string {
  if (!duration) {
    return '-'
  }

  const result = parseISODuration(duration)
  if ('invalid' in result) {
    return '-'
  }

  const { hours, minutes, seconds } = result
  const totalMinutes = hours * 60 + minutes

  if (totalMinutes > 100 || (totalMinutes == 100 && seconds > 0)) {
    // Format as HH:MM:SS
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
  } else {
    // Format as MM:SS
    return [totalMinutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
  }
}

/**
 * Converts ISO 8601 duration string (PT format) to total minutes with postfix.
 * @param duration ISO 8601 duration string (e.g., "PT1H30M45S", "PT30M", "PT45S")
 * @returns Formatted string with total minutes (e.g., "90 min", "30 min") or "-" if invalid/empty
 */
export function formatISoDurationToMinutes(duration?: string | null): string {
  if (!duration) {
    return '-'
  }

  const result = parseISODuration(duration)
  if ('invalid' in result) {
    return '-'
  }

  const { hours, minutes } = result
  const totalMinutes = hours * 60 + minutes

  return `${totalMinutes} min`
}

/**
 * Parses ISO 8601 duration string (PT format) to total minutes as a number.
 * Includes fractional minutes from seconds.
 * @param duration ISO 8601 duration string (e.g., "PT1H30M45S", "PT30M", "PT45S")
 * @returns Total minutes as a decimal number (e.g., 90.75 for 1h 30m 45s) or 0 if invalid/empty
 */
export function parseISODurationToMinutes(duration?: string | null): number {
  if (!duration) return 0

  const result = parseISODuration(duration)
  if ('invalid' in result) return 0

  const { hours, minutes, seconds } = result
  return hours * 60 + minutes + seconds / 60
}

/**
 * Formats elapsed time from milliseconds to a human-readable string.
 * Displays as "Xs", "MM:SS", or "HH:MM:SS" depending on duration.
 * @param timeMs The time value in milliseconds
 * @param startMs The start time in milliseconds to calculate elapsed time from
 * @returns Formatted time string (e.g., "45s", "05:30", "01:30:45")
 */
export function formatElapsedTime(timeMs: number, startMs: number): string {
  const dtMs = Math.max(0, Math.abs(timeMs - startMs))
  const totalSeconds = Math.round(dtMs / 1000)

  // Less than 1 minute: show as seconds
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)

  // Less than 1 hour: show as MM:SS
  if (totalMinutes < 60) {
    const mm = String(totalMinutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${mm}:${ss}`
  }

  // 1 hour or more: show as HH:MM or HH:MM:SS
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')

  if (seconds > 0) {
    const ss = String(seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  return `${hh}:${mm}`
}

/**
 * Formats a date/timestamp to German locale format with zero-padded day and month.
 * @param date Date object, timestamp number, or ISO string
 * @returns Formatted date string (e.g., "01.01.2002, 14:30") or "Unknown" if invalid
 */
export function formatDate(date: Date | number | string | undefined | null): string {
  if (!date) return 'Unknown'

  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return dateObj.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Unknown'
  }
}
