import { describe, expect, it } from 'vitest'
import {
  dateTimeLocalToEpochMs,
  elapsedMinutesSeconds,
  epochFromElapsedMinutesSeconds,
  epochMsToDateTimeLocal,
  formatDurationToMinutes,
  formatDurationToTime,
  parseDuration,
} from '../lib/utils/timeUtils'

describe('timeUtils', () => {
  describe('parseDuration', () => {
    it('should parse full ISO duration (hours, minutes, seconds)', () => {
      expect(parseDuration(5445000)).toEqual({
        hours: 1,
        minutes: 30,
        seconds: 45,
      })
    })

    it('should parse duration with only minutes and seconds', () => {
      expect(parseDuration(1845000)).toEqual({
        hours: 0,
        minutes: 30,
        seconds: 45,
      })
    })

    it('should parse duration with only minutes', () => {
      expect(parseDuration(2700000)).toEqual({
        hours: 0,
        minutes: 45,
        seconds: 0,
      })
    })

    it('should parse duration with only seconds', () => {
      expect(parseDuration(30000)).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 30,
      })
    })

    it('should parse duration with only hours', () => {
      expect(parseDuration(7200000)).toEqual({
        hours: 2,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return zeros for empty string', () => {
      expect(parseDuration('')).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return zeros for undefined', () => {
      expect(parseDuration(undefined)).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return invalid for invalid format', () => {
      const result = parseDuration('invalid')
      expect(result).toEqual({
        invalid: true,
        input: 'invalid',
      })
    })
  })

  describe('formatDurationToTime', () => {
    it('should format as MM:SS for durations <= 100 minutes', () => {
      expect(formatDurationToTime(2730000)).toBe('45:30')
    })

    it('should format as MM:SS for durations < 100 minutes', () => {
      expect(formatDurationToTime(1815000)).toBe('30:15')
    })

    it('should format as HH:MM:SS for durations > 100 minutes (2 hours)', () => {
      expect(formatDurationToTime(9045000)).toBe('02:30:45')
    })

    it('should format as MM:SS for exactly 100 minutes (edge case)', () => {
      expect(formatDurationToTime(6000000)).toBe('100:00')
    })
    it('should format as HH:MM:SS for exactly 100 minutes and a second (edge case)', () => {
      expect(formatDurationToTime(6001000)).toBe('01:40:01')
    })

    it('should format as HH:MM:SS for durations > 100 minutes', () => {
      expect(formatDurationToTime(6320000)).toBe('01:45:20')
    })

    it('should handle only seconds with zero padding', () => {
      expect(formatDurationToTime(30000)).toBe('00:30')
    })

    it('should handle only minutes with zero padding', () => {
      expect(formatDurationToTime(300000)).toBe('05:00')
    })

    it('should handle single digit minutes and seconds', () => {
      expect(formatDurationToTime(303000)).toBe('05:03')
    })

    it('should return "-" for empty string', () => {
      expect(formatDurationToTime('')).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(formatDurationToTime(undefined)).toBe('-')
    })

    it('should return "-" for null', () => {
      expect(formatDurationToTime(null)).toBe('-')
    })

    it('should return "-" for invalid format', () => {
      expect(formatDurationToTime('invalid')).toBe('-')
    })

    it('should handle large hours value', () => {
      expect(formatDurationToTime(37845000)).toBe('10:30:45')
    })

    it('should pad single digits correctly', () => {
      expect(formatDurationToTime(6303000)).toBe('01:45:03')
    })
  })

  describe('formatDurationToMinutes', () => {
    it('should format as minutes for durations', () => {
      expect(formatDurationToMinutes(2730000)).toBe('45 min')
    })

    it('should format as minutes for shorter durations', () => {
      expect(formatDurationToMinutes(1815000)).toBe('30 min')
    })

    it('should calculate total minutes for hours and minutes', () => {
      expect(formatDurationToMinutes(9045000)).toBe('150 min')
    })

    it('should format exactly 100 minutes', () => {
      expect(formatDurationToMinutes(6000000)).toBe('100 min')
    })

    it('should format durations with hours', () => {
      expect(formatDurationToMinutes(6320000)).toBe('105 min')
    })

    it('should handle only seconds', () => {
      expect(formatDurationToMinutes(30000)).toBe('0 min')
    })

    it('should handle only minutes', () => {
      expect(formatDurationToMinutes(300000)).toBe('5 min')
    })

    it('should handle single digit minutes', () => {
      expect(formatDurationToMinutes(303000)).toBe('5 min')
    })

    it('should return "-" for empty string', () => {
      expect(formatDurationToMinutes('')).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(formatDurationToMinutes(undefined)).toBe('-')
    })

    it('should return "-" for null', () => {
      expect(formatDurationToMinutes(null)).toBe('-')
    })

    it('should return "-" for invalid format', () => {
      expect(formatDurationToMinutes('invalid')).toBe('-')
    })

    it('should handle large hours value', () => {
      expect(formatDurationToMinutes(37845000)).toBe('630 min')
    })

    it('should pad single digits correctly', () => {
      expect(formatDurationToMinutes(3903000)).toBe('65 min')
    })
  })

  describe('elapsedMinutesSeconds / epochFromElapsedMinutesSeconds', () => {
    const diveStart = 1_700_000_000_000

    it('returns null for an unset (null/undefined) value', () => {
      expect(elapsedMinutesSeconds(null, diveStart)).toBeNull()
      expect(elapsedMinutesSeconds(undefined, diveStart)).toBeNull()
    })

    it('splits an epoch timestamp into minutes/seconds elapsed since start', () => {
      const epoch = diveStart + (12 * 60 + 34) * 1000
      expect(elapsedMinutesSeconds(epoch, diveStart)).toEqual({ minutes: 12, seconds: 34 })
    })

    it('clamps a timestamp before the dive start to 0:00 rather than going negative', () => {
      expect(elapsedMinutesSeconds(diveStart - 5000, diveStart)).toEqual({
        minutes: 0,
        seconds: 0,
      })
    })

    it('round-trips through epochFromElapsedMinutesSeconds', () => {
      const epoch = epochFromElapsedMinutesSeconds(45, 30, diveStart)
      expect(elapsedMinutesSeconds(epoch, diveStart)).toEqual({ minutes: 45, seconds: 30 })
    })

    it('clamps negative minutes/seconds inputs to 0 rather than shifting before the dive start', () => {
      expect(epochFromElapsedMinutesSeconds(-3, -10, diveStart)).toBe(diveStart)
    })

    it('clamps an out-of-range seconds value to 59 rather than rolling into the next minute', () => {
      expect(epochFromElapsedMinutesSeconds(1, 90, diveStart)).toBe(
        epochFromElapsedMinutesSeconds(1, 59, diveStart),
      )
    })
  })

  describe('epochMsToDateTimeLocal / dateTimeLocalToEpochMs', () => {
    it('returns an empty string for a null/undefined/NaN value', () => {
      expect(epochMsToDateTimeLocal(null)).toBe('')
      expect(epochMsToDateTimeLocal(undefined)).toBe('')
      expect(epochMsToDateTimeLocal(Number.NaN)).toBe('')
    })

    it('formats an epoch as a local YYYY-MM-DDTHH:mm string with zero-padding', () => {
      // Build the expectation from the same local-time parts so the test is timezone-agnostic.
      const d = new Date(2026, 0, 5, 8, 3)
      expect(epochMsToDateTimeLocal(d.getTime())).toBe('2026-01-05T08:03')
    })

    it('round-trips a local datetime string back to the same epoch (minute precision)', () => {
      const d = new Date(2025, 11, 24, 14, 30)
      const local = epochMsToDateTimeLocal(d.getTime())
      expect(dateTimeLocalToEpochMs(local)).toBe(d.getTime())
    })

    it('returns null for an empty or invalid datetime string', () => {
      expect(dateTimeLocalToEpochMs('')).toBeNull()
      expect(dateTimeLocalToEpochMs(null)).toBeNull()
      expect(dateTimeLocalToEpochMs('not-a-date')).toBeNull()
    })
  })
})
