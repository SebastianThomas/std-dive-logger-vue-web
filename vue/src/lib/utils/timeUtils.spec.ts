import { describe, expect, it } from 'vitest'
import { formatISoDurationToMinutes, formatISoDurationToTime, parseISODuration } from './timeUtils'

describe('timeUtils', () => {
  describe('parseISODuration', () => {
    it('should parse full ISO duration (hours, minutes, seconds)', () => {
      expect(parseISODuration('PT1H30M45S')).toEqual({
        hours: 1,
        minutes: 30,
        seconds: 45,
      })
    })

    it('should parse duration with only minutes and seconds', () => {
      expect(parseISODuration('PT30M45S')).toEqual({
        hours: 0,
        minutes: 30,
        seconds: 45,
      })
    })

    it('should parse duration with only minutes', () => {
      expect(parseISODuration('PT45M')).toEqual({
        hours: 0,
        minutes: 45,
        seconds: 0,
      })
    })

    it('should parse duration with only seconds', () => {
      expect(parseISODuration('PT30S')).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 30,
      })
    })

    it('should parse duration with only hours', () => {
      expect(parseISODuration('PT2H')).toEqual({
        hours: 2,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return zeros for empty string', () => {
      expect(parseISODuration('')).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return zeros for undefined', () => {
      expect(parseISODuration(undefined)).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
      })
    })

    it('should return invalid for invalid format', () => {
      const result = parseISODuration('invalid')
      expect(result).toEqual({
        invalid: true,
        input: 'invalid',
      })
    })
  })

  describe('formatISoDurationToTime', () => {
    it('should format as MM:SS for durations <= 100 minutes', () => {
      expect(formatISoDurationToTime('PT45M30S')).toBe('45:30')
    })

    it('should format as MM:SS for durations < 100 minutes', () => {
      expect(formatISoDurationToTime('PT30M15S')).toBe('30:15')
    })

    it('should format as HH:MM:SS for durations > 100 minutes (2 hours)', () => {
      expect(formatISoDurationToTime('PT2H30M45S')).toBe('02:30:45')
    })

    it('should format as MM:SS for exactly 100 minutes (edge case)', () => {
      expect(formatISoDurationToTime('PT1H40M')).toBe('100:00')
    })
    it('should format as HH:MM:SS for exactly 100 minutes and a second (edge case)', () => {
      expect(formatISoDurationToTime('PT1H40M01S')).toBe('01:40:01')
    })

    it('should format as HH:MM:SS for durations > 100 minutes', () => {
      expect(formatISoDurationToTime('PT1H45M20S')).toBe('01:45:20')
    })

    it('should handle only seconds with zero padding', () => {
      expect(formatISoDurationToTime('PT30S')).toBe('00:30')
    })

    it('should handle only minutes with zero padding', () => {
      expect(formatISoDurationToTime('PT5M')).toBe('05:00')
    })

    it('should handle single digit minutes and seconds', () => {
      expect(formatISoDurationToTime('PT5M3S')).toBe('05:03')
    })

    it('should return "-" for empty string', () => {
      expect(formatISoDurationToTime('')).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(formatISoDurationToTime(undefined)).toBe('-')
    })

    it('should return "-" for null', () => {
      expect(formatISoDurationToTime(null)).toBe('-')
    })

    it('should return "-" for invalid format', () => {
      expect(formatISoDurationToTime('invalid')).toBe('-')
    })

    it('should handle large hours value', () => {
      expect(formatISoDurationToTime('PT10H30M45S')).toBe('10:30:45')
    })

    it('should pad single digits correctly', () => {
      expect(formatISoDurationToTime('PT1H45M3S')).toBe('01:45:03')
    })
  })

  describe('formatISoDurationToMinutes', () => {
    it('should format as minutes for durations', () => {
      expect(formatISoDurationToMinutes('PT45M30S')).toBe('45 min')
    })

    it('should format as minutes for shorter durations', () => {
      expect(formatISoDurationToMinutes('PT30M15S')).toBe('30 min')
    })

    it('should calculate total minutes for hours and minutes', () => {
      expect(formatISoDurationToMinutes('PT2H30M45S')).toBe('150 min')
    })

    it('should format exactly 100 minutes', () => {
      expect(formatISoDurationToMinutes('PT1H40M')).toBe('100 min')
    })

    it('should format durations with hours', () => {
      expect(formatISoDurationToMinutes('PT1H45M20S')).toBe('105 min')
    })

    it('should handle only seconds', () => {
      expect(formatISoDurationToMinutes('PT30S')).toBe('0 min')
    })

    it('should handle only minutes', () => {
      expect(formatISoDurationToMinutes('PT5M')).toBe('5 min')
    })

    it('should handle single digit minutes', () => {
      expect(formatISoDurationToMinutes('PT5M3S')).toBe('5 min')
    })

    it('should return "-" for empty string', () => {
      expect(formatISoDurationToMinutes('')).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(formatISoDurationToMinutes(undefined)).toBe('-')
    })

    it('should return "-" for null', () => {
      expect(formatISoDurationToMinutes(null)).toBe('-')
    })

    it('should return "-" for invalid format', () => {
      expect(formatISoDurationToMinutes('invalid')).toBe('-')
    })

    it('should handle large hours value', () => {
      expect(formatISoDurationToMinutes('PT10H30M45S')).toBe('630 min')
    })

    it('should pad single digits correctly', () => {
      expect(formatISoDurationToMinutes('PT1H5M3S')).toBe('65 min')
    })
  })
})
