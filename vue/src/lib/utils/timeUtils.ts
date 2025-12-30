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
  if (!duration) { return '-' }

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
  if (!duration) { return '-' }

  const result = parseISODuration(duration)
  if ('invalid' in result) {
    return '-'
  }

  const { hours, minutes } = result
  const totalMinutes = hours * 60 + minutes

  return `${totalMinutes} min`
}
