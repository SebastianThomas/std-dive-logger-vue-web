import { describe, it, expect } from 'vitest'
import { nearestSampleTime } from '@/lib/graph/snapToSample'
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

describe('nearestSampleTime', () => {
  it('snaps to the closer of two samples straddling the target', () => {
    const p = profile([measurement(0, 0, 0), measurement(1, 10_000, 5), measurement(2, 20_000, 0)])
    expect(nearestSampleTime(p, 11_000)).toBe(10_000)
    expect(nearestSampleTime(p, 3_000)).toBe(0)
  })

  it('returns the sample itself when the target lands exactly on one', () => {
    const p = profile([measurement(0, 0, 0), measurement(1, 10_000, 5), measurement(2, 20_000, 0)])
    expect(nearestSampleTime(p, 10_000)).toBe(10_000)
  })

  it('is not fooled by sample order - finds the true nearest regardless of input order', () => {
    // Deliberately out of chronological order, matching this function's own doc comment about
    // not assuming sorted input.
    const p = profile([measurement(0, 20_000, 0), measurement(1, 0, 0), measurement(2, 10_000, 5)])
    expect(nearestSampleTime(p, 9_000)).toBe(10_000)
  })

  it('clamps to the nearest end sample for a target outside the profile entirely', () => {
    const p = profile([measurement(0, 100_000, 0), measurement(1, 110_000, 5)])
    expect(nearestSampleTime(p, 0)).toBe(100_000)
    expect(nearestSampleTime(p, 999_999)).toBe(110_000)
  })

  it('returns the target time itself, unsnapped, for an empty profile', () => {
    expect(nearestSampleTime(profile([]), 12_345)).toBe(12_345)
  })
})
