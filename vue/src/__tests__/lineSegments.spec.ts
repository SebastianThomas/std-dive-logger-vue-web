import { describe, it, expect } from 'vitest'
import { splitByTimeGap, medianSampleIntervalMs } from '@/lib/graph/lineSegments'

describe('splitByTimeGap', () => {
  it('returns a single segment when every point is within the gap threshold', () => {
    const points: [number, number][] = [
      [0, 1],
      [10, 2],
      [20, 3],
    ]
    expect(splitByTimeGap(points, 15)).toEqual([points])
  })

  it('splits into two segments across a gap bigger than the threshold', () => {
    const points: [number, number][] = [
      [0, 1],
      [10, 2],
      [1000, 99],
      [1010, 98],
    ]
    expect(splitByTimeGap(points, 100)).toEqual([
      [
        [0, 1],
        [10, 2],
      ],
      [
        [1000, 99],
        [1010, 98],
      ],
    ])
  })

  it('handles an empty input', () => {
    expect(splitByTimeGap([], 100)).toEqual([])
  })

  it('handles a single point', () => {
    expect(splitByTimeGap([[0, 1]], 100)).toEqual([[[0, 1]]])
  })

  it('splits into more than two segments across multiple gaps', () => {
    const points: [number, number][] = [
      [0, 1],
      [500, 2],
      [1000, 3],
    ]
    expect(splitByTimeGap(points, 100)).toEqual([[[0, 1]], [[500, 2]], [[1000, 3]]])
  })
})

describe('medianSampleIntervalMs', () => {
  it('returns 0 for fewer than two samples', () => {
    expect(medianSampleIntervalMs([])).toBe(0)
    expect(medianSampleIntervalMs([100])).toBe(0)
  })

  it('returns the interval for evenly spaced samples', () => {
    expect(medianSampleIntervalMs([0, 10, 20, 30])).toBe(10)
  })

  it('is robust to a single unusually large gap (median, not mean)', () => {
    // Deltas: 10, 10, 10, 1000 - the mean would be skewed to ~257, the median stays at 10.
    expect(medianSampleIntervalMs([0, 10, 20, 30, 1030])).toBe(10)
  })

  it('is unaffected by input order', () => {
    expect(medianSampleIntervalMs([30, 0, 20, 10])).toBe(10)
  })
})
