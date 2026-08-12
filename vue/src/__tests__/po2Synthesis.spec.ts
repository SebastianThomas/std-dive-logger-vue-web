import { describe, it, expect } from 'vitest'
import { synthesizePo2Calculated } from '@/lib/graph/po2Synthesis'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const measurementAt = (time: number, depth: number, o2?: number): DiveMeasurementWithId =>
  ({
    id: time,
    measurement: {
      time,
      depth,
      gas: o2 !== undefined ? { o2, n2: 1 - o2, he: 0 } : undefined,
    },
  }) as unknown as DiveMeasurementWithId

const profileOf = (entries: DiveMeasurementWithId[]): DiveProfile =>
  ({ measurements: entries }) as unknown as DiveProfile

describe('synthesizePo2Calculated', () => {
  it('returns nothing before the first known gas mix', () => {
    const profile = profileOf([measurementAt(0, 10), measurementAt(10, 20)])
    expect(synthesizePo2Calculated(profile)).toEqual([])
  })

  it('computes FO2 x ambient pressure once a gas mix is known', () => {
    const profile = profileOf([measurementAt(0, 20, 0.21)])
    const result = synthesizePo2Calculated(profile)
    expect(result).toHaveLength(1)
    const [time, po2] = result[0]!
    expect(time).toBe(0)
    // 20m -> 3 bar ambient (1 + 20/10) x 0.21 FO2
    expect(po2).toBeCloseTo(0.63, 5)
  })

  it('carries the last known gas mix forward between switches', () => {
    const profile = profileOf([
      measurementAt(0, 10, 0.21),
      measurementAt(10, 10),
      measurementAt(20, 10, 1.0),
      measurementAt(30, 10),
    ])
    const result = synthesizePo2Calculated(profile)
    expect(result).toEqual([
      [0, 0.21 * 2],
      [10, 0.21 * 2],
      [20, 1.0 * 2],
      [30, 1.0 * 2],
    ])
  })

  it('skips a sample with a non-finite depth', () => {
    const profile = profileOf([measurementAt(0, 10, 0.21), measurementAt(10, NaN)])
    expect(synthesizePo2Calculated(profile)).toEqual([[0, 0.42]])
  })
})
