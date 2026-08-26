import { describe, it, expect } from 'vitest'
import { computeRangeStats } from '@/lib/graph/rangeStats'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

function measurement(id: number, time: number, depth: number): DiveMeasurementWithId {
  return {
    id,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth,
      ndl: '',
      deco: [],
    },
  }
}

function profile(measurements: DiveMeasurementWithId[]): DiveProfile {
  return {
    id: 1,
    diveComputer: {
      id: 1,
      manufacturer: { id: 1, name: 'Test' },
      serialNumber: '',
      customIdentifier: '',
      ccrUnitId: null,
    },
    start: measurements[0]?.measurement.time ?? 0,
    end: measurements[measurements.length - 1]?.measurement.time ?? 0,
    measurements,
    summary: { start: 0, end: 0, averageDepth: 0, maxDepth: 0, bottomTime: 'PT0S' },
  }
}

describe('computeRangeStats', () => {
  it('computes max/average depth and bottom time for the full range', () => {
    const p = profile([
      measurement(0, 0, 0),
      measurement(1, 60_000, 10),
      measurement(2, 120_000, 20),
      measurement(3, 180_000, 10),
      measurement(4, 240_000, 0),
    ])
    const stats = computeRangeStats(p, 0, 240_000)!
    expect(stats.maxDepth).toBe(20)
    expect(stats.averageDepth).toBe(8)
    expect(stats.bottomTimeSeconds).toBe(240)
    expect(stats.measurementCount).toBe(5)
  })

  it('recomputes for a narrower selection, excluding points outside it', () => {
    const p = profile([
      measurement(0, 0, 0),
      measurement(1, 60_000, 10),
      measurement(2, 120_000, 20),
      measurement(3, 180_000, 10),
      measurement(4, 240_000, 0),
    ])
    // Only the middle three points.
    const stats = computeRangeStats(p, 60_000, 180_000)!
    expect(stats.maxDepth).toBe(20)
    expect(stats.averageDepth).toBeCloseTo((10 + 20 + 10) / 3)
    expect(stats.bottomTimeSeconds).toBe(120)
    expect(stats.measurementCount).toBe(3)
  })

  it('returns null when no measurement falls inside the range', () => {
    const p = profile([measurement(0, 0, 10), measurement(1, 60_000, 10)])
    expect(computeRangeStats(p, 1_000_000, 2_000_000)).toBeNull()
  })

  it('returns null for an empty profile', () => {
    expect(computeRangeStats(profile([]), 0, 1000)).toBeNull()
  })
})
