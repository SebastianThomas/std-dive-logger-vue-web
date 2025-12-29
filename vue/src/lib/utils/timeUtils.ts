// Extract ISO duration string to numbers
export function parseISODuration(duration?: string): {
  hours: number
  minutes: number
  seconds: number
} {
  if (!duration) return { hours: 0, minutes: 0, seconds: 0 }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return { hours: 0, minutes: 0, seconds: 0 }

  return {
    hours: Number(match[1] ?? 0),
    minutes: Number(match[2] ?? 0),
    seconds: Number(match[3] ?? 0),
  }
}

// Format numbers to human-readable string
export function showDuration({
  hours,
  minutes,
  seconds,
}: {
  hours: number
  minutes: number
  seconds: number
}): string {
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}
