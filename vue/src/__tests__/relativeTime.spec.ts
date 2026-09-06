import { describe, it, expect } from 'vitest'
import { durationToMinutesSeconds, minutesSecondsToDuration, formatDate, epochMsToDateTimeLocal, dateTimeLocalToEpochMs } from '@/lib/utils/timeUtils'

describe('relative time and site clocks', () => {
  it('keeps durations numeric with millisecond precision', () => {
    expect(durationToMinutesSeconds(61250)).toEqual({ minutes: 1, seconds: 1.25 })
    expect(minutesSecondsToDuration(1, 1.25)).toBe(61250)
    expect(durationToMinutesSeconds(null)).toBeNull()
  })
  it('uses the site zone independently of the browser clock', () => {
    const instant = Date.parse('2026-07-01T10:00:00Z')
    expect(formatDate(instant, 'Europe/Zurich')).toContain('12:00')
    expect(epochMsToDateTimeLocal(instant, 'Asia/Kathmandu')).toBe('2026-07-01T15:45')
    expect(dateTimeLocalToEpochMs('2026-07-01T15:45', 'Asia/Kathmandu')).toBe(instant)
  })
  it('rejects nonexistent and ambiguous local times', () => {
    expect(dateTimeLocalToEpochMs('2026-03-29T02:30', 'Europe/Zurich')).toBeNull()
    expect(dateTimeLocalToEpochMs('2026-10-25T02:30', 'Europe/Zurich')).toBeNull()
  })
})
