type DurationParts = { hours: number; minutes: number; seconds: number }
export type ParsedDuration = DurationParts | { invalid: true; input: unknown }

/** Numeric API durations are milliseconds. */
export function parseDuration(duration?: number | string | null): ParsedDuration {
  if (duration == null || duration === '') return { hours: 0, minutes: 0, seconds: 0 }
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return { invalid: true, input: duration }
  const total = duration / 1000
  return { hours: Math.trunc(total / 3600), minutes: Math.trunc(total / 60) % 60, seconds: total % 60 }
}

export function formatDurationToTime(duration?: number | string | null): string {
  if (duration == null || duration === '') return '-'
  const parts = parseDuration(duration)
  if ('invalid' in parts) return '-'
  const minutes = parts.hours * 60 + parts.minutes
  const values = minutes > 100 || (minutes === 100 && parts.seconds > 0)
    ? [parts.hours, parts.minutes, parts.seconds] : [minutes, parts.seconds]
  return values.map(n => String(n).padStart(2, '0')).join(':')
}

export function formatDurationToMinutes(duration?: number | string | null): string {
  if (duration == null || duration === '') return '-'
  const parts = parseDuration(duration)
  return 'invalid' in parts ? '-' : `${parts.hours * 60 + parts.minutes} min`
}

export function durationToMinutes(duration?: number | string | null): number {
  return typeof duration === 'number' && Number.isFinite(duration) ? duration / 60000 : 0
}

/**
 * Splits an absolute epoch-millis timestamp into whole minutes/seconds elapsed since a dive's
 * start - for editable "time since start" fields (e.g. a cylinder's Usage Start/End) where a
 * diver thinks in "12 minutes in", not an absolute clock time. Returns null for an unset value so
 * the two number inputs can render empty rather than "0:00".
 */
export function elapsedMinutesSeconds(
  epochMs: number | null | undefined,
  startMs: number,
): { minutes: number; seconds: number } | null {
  if (epochMs == null) return null
  const totalSeconds = Math.max(0, Math.round((epochMs - startMs) / 1000))
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 }
}

/** Inverse of {@link elapsedMinutesSeconds} - combines minutes+seconds elapsed since a dive's
 * start back into an absolute epoch-millis timestamp for storage. */
export function epochFromElapsedMinutesSeconds(
  minutes: number,
  seconds: number,
  startMs: number,
): number {
  return startMs + (Math.max(0, minutes) * 60 + Math.max(0, Math.min(59, seconds))) * 1000
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
 * Formats an absolute epoch-millis timestamp as the local `YYYY-MM-DDTHH:mm` string an
 * `<input type="datetime-local">` expects (its value is always local wall-clock, never an offset).
 * Returns '' for a null/undefined value so the input renders empty. Inverse: {@link
 * dateTimeLocalToEpochMs}.
 */
export function epochMsToDateTimeLocal(epochMs: number | null | undefined, timeZone?: string | null): string {
  if (epochMs == null || Number.isNaN(epochMs)) return ''
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(epochMs)
    const part = (name: string) => parts.find(p => p.type === name)?.value ?? ''
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
  }
  const d = new Date(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/**
 * Parses a `datetime-local` input value (local wall-clock `YYYY-MM-DDTHH:mm`) back to an absolute
 * epoch-millis timestamp. Returns null for an empty/invalid value.
 */
export function dateTimeLocalToEpochMs(value: string | null | undefined, timeZone?: string | null): number | null {
  if (!value) return null
  if (timeZone) {
    const naive = Date.parse(value + ":00Z")
    if (!Number.isFinite(naive)) return null
    const candidates = new Set<number>()
    for (const day of [-1, 0, 1]) {
      const probe = naive + day * 86400000
      const local = Date.parse(epochMsToDateTimeLocal(probe, timeZone) + ":00Z")
      const candidate = naive - (local - probe)
      if (epochMsToDateTimeLocal(candidate, timeZone) === value) candidates.add(candidate)
    }
    return candidates.size === 1 ? [...candidates][0]! : null
  }
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * Formats a date/timestamp to German locale format with zero-padded day and month.
 * @param date Date object, timestamp number, or ISO string
 * @returns Formatted date string (e.g., "01.01.2002, 14:30") or "Unknown" if invalid
 */
export function formatDate(date: Date | number | string | undefined | null, timeZone?: string | null): string {
  if (!date) return 'Unknown'

  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return dateObj.toLocaleString('de-DE', {
      timeZone: timeZone ?? 'UTC',
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

/** API durations are elapsed milliseconds, including negative offsets. */
export function durationToMinutesSeconds(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  const seconds = value / 1000
  return { minutes: Math.trunc(seconds / 60), seconds: seconds % 60 }
}

export function minutesSecondsToDuration(minutes: number, seconds: number): number {
  return (minutes * 60 + seconds) * 1000
}

export function elapsedFromStart(ms: number, start: number): number {
  return ms - start
}
