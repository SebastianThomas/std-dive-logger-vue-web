import { describe, it, expect } from 'vitest'
import { interpolateAt, stepAfterValueAt, valueAtForMetric } from '@/lib/graph/valueInterpolation'

describe('interpolateAt', () => {
  it('returns undefined for an empty or missing list', () => {
    expect(interpolateAt(undefined, 5)).toBeUndefined()
    expect(interpolateAt([], 5)).toBeUndefined()
  })

  it('returns the single value for a one-point list regardless of t', () => {
    expect(interpolateAt([[10, 1.5]], 0)).toBe(1.5)
    expect(interpolateAt([[10, 1.5]], 100)).toBe(1.5)
  })

  it('clamps to the first value before the range and the last value after it', () => {
    const points: [number, number][] = [
      [10, 1.0],
      [20, 2.0],
    ]
    expect(interpolateAt(points, 0)).toBe(1.0)
    expect(interpolateAt(points, 30)).toBe(2.0)
  })

  it('linearly blends between two surrounding points', () => {
    const points: [number, number][] = [
      [10, 1.0],
      [20, 2.0],
    ]
    expect(interpolateAt(points, 15)).toBeCloseTo(1.5)
    expect(interpolateAt(points, 12)).toBeCloseTo(1.2)
  })
})

describe('stepAfterValueAt', () => {
  it('returns undefined for an empty or missing list', () => {
    expect(stepAfterValueAt(undefined, 5)).toBeUndefined()
    expect(stepAfterValueAt([], 5)).toBeUndefined()
  })

  it('holds at the previous point rather than blending, matching curveStepAfter', () => {
    const points: [number, number][] = [
      [10, 1.0],
      [20, 2.0],
    ]
    // Anywhere strictly between the two samples still reads as the earlier one - the step
    // hasn't happened yet - unlike interpolateAt, which would blend towards 2.0.
    expect(stepAfterValueAt(points, 15)).toBe(1.0)
    expect(stepAfterValueAt(points, 19.999)).toBe(1.0)
  })

  it('snaps to the new value exactly at the next sample time', () => {
    const points: [number, number][] = [
      [10, 1.0],
      [20, 2.0],
    ]
    expect(stepAfterValueAt(points, 20)).toBe(2.0)
  })

  it('clamps to the first value before the range and the last value after it', () => {
    const points: [number, number][] = [
      [10, 1.0],
      [20, 2.0],
    ]
    expect(stepAfterValueAt(points, 0)).toBe(1.0)
    expect(stepAfterValueAt(points, 30)).toBe(2.0)
  })

  it('holds correctly across three or more held segments (a sparse whole-dive series)', () => {
    // Mirrors a real CCR dive where PO2 calculated only logs a handful of setpoint changes
    // across a long dive, with long flat holds in between.
    const points: [number, number][] = [
      [0, 1.2],
      [1200, 1.3],
      [3000, 0.8],
    ]
    expect(stepAfterValueAt(points, 600)).toBe(1.2)
    expect(stepAfterValueAt(points, 1200)).toBe(1.3)
    expect(stepAfterValueAt(points, 2000)).toBe(1.3)
    expect(stepAfterValueAt(points, 2999)).toBe(1.3)
    expect(stepAfterValueAt(points, 3000)).toBe(0.8)
    expect(stepAfterValueAt(points, 4000)).toBe(0.8)
  })
})

describe('valueAtForMetric', () => {
  const points: [number, number][] = [
    [10, 1.0],
    [20, 2.0],
  ]

  it('uses the step-after strategy for po2Calculated', () => {
    expect(valueAtForMetric(points, 15, 'po2Calculated')).toBe(1.0)
  })

  it('uses linear interpolation for every other metric', () => {
    expect(valueAtForMetric(points, 15, 'po2Measured')).toBeCloseTo(1.5)
    expect(valueAtForMetric(points, 15, 'po2Setpoint')).toBeCloseTo(1.5)
    expect(valueAtForMetric(points, 15, 'temp')).toBeCloseTo(1.5)
  })
})
