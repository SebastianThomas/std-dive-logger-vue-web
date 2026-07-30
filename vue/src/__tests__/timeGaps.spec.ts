import { describe, it, expect } from 'vitest'
import { detectTimeGaps, buildVirtualTimeMapper } from '@/lib/graph/timeGaps'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const measurementAt = (time: number): DiveMeasurementWithId =>
  ({ id: time, measurement: { time, depth: 1 } }) as unknown as DiveMeasurementWithId

const profileOf = (times: number[]): DiveProfile =>
  ({ measurements: times.map(measurementAt) }) as unknown as DiveProfile

describe('detectTimeGaps', () => {
  it('finds no gaps in a single continuous profile', () => {
    const profile = profileOf(Array.from({ length: 60 }, (_, i) => i * 1000))
    expect(detectTimeGaps([profile])).toEqual([])
  })

  it('detects a large gap between two merged profiles from unrelated sessions', () => {
    // Profile A: 45 minutes of 1s samples. Profile B (wrong merge): starts 56 days later.
    const aDurationMs = 45 * 60 * 1000
    const profileA = profileOf([0, aDurationMs / 2, aDurationMs])
    const bStart = aDurationMs + 56 * 24 * 60 * 60 * 1000
    const profileB = profileOf([bStart, bStart + aDurationMs / 2, bStart + aDurationMs])

    const gaps = detectTimeGaps([profileA, profileB])
    expect(gaps).toEqual([{ start: aDurationMs, end: bStart }])
  })

  it('does not flag an ordinary sampling gap as a break', () => {
    // A 40-minute dive with a 5s gap in an otherwise continuous 1s sampling stream - a tiny
    // fraction of the profile's own duration, unlike a genuinely mismatched merge.
    const times: number[] = []
    for (let t = 0; t < 40 * 60 * 1000; t += 1000) {
      if (t >= 10 * 60 * 1000 && t < 10 * 60 * 1000 + 5000) continue // skip a 5s stretch
      times.push(t)
    }
    expect(detectTimeGaps([profileOf(times)])).toEqual([])
  })

  it('returns no gaps for zero or one measurement', () => {
    expect(detectTimeGaps([profileOf([])])).toEqual([])
    expect(detectTimeGaps([profileOf([1000])])).toEqual([])
  })
})

describe('buildVirtualTimeMapper', () => {
  it('is the identity mapping when there are no gaps', () => {
    const mapper = buildVirtualTimeMapper([], [0, 1000, 2000])
    expect(mapper.toVirtual(1500)).toBe(1500)
    expect(mapper.toReal(1500)).toBe(1500)
    expect(mapper.breakPositions).toEqual([])
  })

  it('compresses a gap and keeps toVirtual/toReal as exact inverses outside it', () => {
    const allTimes = [0, 1000, 100_000, 101_000]
    const gaps = [{ start: 1000, end: 100_000 }]
    const mapper = buildVirtualTimeMapper(gaps, allTimes)

    // Points before the gap are unaffected.
    expect(mapper.toVirtual(0)).toBe(0)
    expect(mapper.toVirtual(1000)).toBe(1000)

    // The point right after the gap is much closer in virtual time than the ~99s real gap.
    const virtualAfter = mapper.toVirtual(100_000)
    expect(virtualAfter - mapper.toVirtual(1000)).toBeLessThan(100_000 - 1000)
    expect(virtualAfter).toBeGreaterThan(1000)

    // Round-tripping real -> virtual -> real recovers the original value.
    for (const t of allTimes) {
      expect(mapper.toReal(mapper.toVirtual(t))).toBeCloseTo(t, 6)
    }

    expect(mapper.breakPositions).toHaveLength(1)
  })

  it('preserves ordering (monotonic) across multiple gaps', () => {
    const allTimes = [0, 10_000, 500_000, 510_000, 900_000, 910_000]
    const gaps = [
      { start: 10_000, end: 500_000 },
      { start: 510_000, end: 900_000 },
    ]
    const mapper = buildVirtualTimeMapper(gaps, allTimes)
    const virtualTimes = allTimes.map(mapper.toVirtual)
    for (let i = 1; i < virtualTimes.length; i++) {
      expect(virtualTimes[i]).toBeGreaterThan(virtualTimes[i - 1]!)
    }
    expect(mapper.breakPositions).toHaveLength(2)
  })
})
