import { describe, it, expect } from 'vitest'
import { mergeRanges, suggestCut, trimGaps, withGapBreaks } from '@/lib/graph/profileCuts'
import { computeRangeStats } from '@/lib/graph/rangeStats'
import { detectTimeGaps } from '@/lib/graph/timeGaps'
import type { DiveProfile, DiveMeasurementWithId, TimeRange } from '@/lib/types/dive'

const MINUTE = 60_000

/** One sample a minute; none strictly inside `gaps`, as after a real cut. */
function profile(depthAt: (minute: number) => number, minutes: number, gaps?: TimeRange[]): DiveProfile {
  const measurements: DiveMeasurementWithId[] = []
  for (let m = 0; m <= minutes; m++) {
    measurements.push({
      id: m,
      measurement: {
        time: m * MINUTE,
        temperature: { value: 15, unit: 'CELSIUS' },
        depth: depthAt(m),
        ndl: null,
        deco: [],
      },
    })
  }
  const kept = measurements.filter(
    (m) => !gaps?.some((g) => m.measurement.time > g.start && m.measurement.time < g.end),
  )
  return {
    id: 1,
    diveComputer: {
      id: 1,
      manufacturer: { id: 1, name: 'Test' },
      serialNumber: '',
      customIdentifier: '',
      ccrUnitId: null,
    },
    start: 0,
    end: minutes * MINUTE,
    measurements: kept,
    summary: { start: 0, end: 0, averageDepth: 0, maxDepth: 0, bottomTime: 0 },
    gaps,
  }
}

// 20 min at 20 m, 15 min at the surface, 20 min at 15 m.
const twoParts = (m: number) => (m < 20 ? 20 : m < 35 ? 0.3 : 15)

describe('profile cuts', () => {
  it('suggests the surface section between two deeper parts', () => {
    expect(suggestCut(profile(twoParts, 55), 0, 55 * MINUTE)).toEqual({
      start: 20 * MINUTE,
      end: 34 * MINUTE,
    })
  })

  it('falls back to the middle samples when there is no surface section', () => {
    const cut = suggestCut(profile(() => 20, 40), 0, 40 * MINUTE)
    expect(cut.start).toBeLessThan(20 * MINUTE)
    expect(cut.end).toBeGreaterThan(20 * MINUTE)
    // Never inside an earlier cut's gap, where it would remove nothing.
    const gapped = profile(() => 20, 40, [{ start: 15 * MINUTE, end: 25 * MINUTE }])
    const next = suggestCut(gapped, 0, 40 * MINUTE)
    expect(computeRangeStats(gapped, 0, 40 * MINUTE, [next])!.measurementCount).toBeLessThan(
      gapped.measurements.length,
    )
  })

  it('leaves a gap between the samples around a cut, and none for a cut removing nothing', () => {
    const p = profile(twoParts, 55)
    expect(trimGaps(p, 0, 55 * MINUTE, [{ start: 20 * MINUTE, end: 34 * MINUTE }])).toEqual([
      { start: 19 * MINUTE, end: 35 * MINUTE },
    ])
    expect(trimGaps(p, 0, 55 * MINUTE, [{ start: 20.2 * MINUTE, end: 20.8 * MINUTE }])).toEqual([])
  })

  it('keeps existing gaps clipped to the kept range', () => {
    const p = profile(twoParts, 55, [{ start: 19 * MINUTE, end: 35 * MINUTE }])
    expect(trimGaps(p, 25 * MINUTE, 55 * MINUTE, [])).toEqual([])
    expect(trimGaps(p, 10 * MINUTE, 55 * MINUTE, [])).toEqual([
      { start: 19 * MINUTE, end: 35 * MINUTE },
    ])
  })

  it('leaves cut samples and cut time out of the live stats', () => {
    const p = profile(twoParts, 55)
    const stats = computeRangeStats(p, 0, 55 * MINUTE, [{ start: 20 * MINUTE, end: 34 * MINUTE }])!
    expect(stats.measurementCount).toBe(56 - 15)
    expect(stats.bottomTimeSeconds).toBe((55 - 16) * 60)
    expect(stats.averageDepth).toBeCloseTo((20 * 20 + 21 * 15) / 41)
  })

  it('merges overlapping and touching ranges', () => {
    expect(
      mergeRanges([
        { start: 5, end: 8 },
        { start: 0, end: 2 },
        { start: 2, end: 3 },
        { start: 7, end: 9 },
      ]),
    ).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 9 },
    ])
  })

  it('breaks the depth line inside each gap', () => {
    const points: [number, number][] = [
      [0, 1],
      [10, 2],
      [20, 3],
    ]
    const broken = withGapBreaks(points, [{ start: 10, end: 20 }])
    expect(broken.map(([t]) => t)).toEqual([0, 10, 15, 20])
    expect(Number.isNaN(broken[2]![1])).toBe(true)
  })

  it('compresses a cut gap on the timeline unless another profile has data in it', () => {
    const gap = { start: 19 * MINUTE, end: 35 * MINUTE }
    const cut = profile(twoParts, 55, [gap])
    expect(detectTimeGaps([cut])).toEqual([gap])
    expect(detectTimeGaps([cut, { ...profile(twoParts, 55), id: 2 }])).toEqual([])
  })
})
