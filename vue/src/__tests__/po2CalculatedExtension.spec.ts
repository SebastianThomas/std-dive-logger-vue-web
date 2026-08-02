import { describe, it, expect } from 'vitest'
import { extendPo2CalculatedToBoundary } from '@/lib/graph/po2CalculatedExtension'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const measurementAt = (time: number, mode?: 'OC' | 'CC'): DiveMeasurementWithId =>
  ({ id: time, measurement: { time, depth: 1, mode } }) as unknown as DiveMeasurementWithId

const profileOf = (
  entries: [number, ('OC' | 'CC')?][],
  end: number,
): DiveProfile =>
  ({
    start: entries[0]?.[0] ?? 0,
    end,
    measurements: entries.map(([t, m]) => measurementAt(t, m)),
  }) as unknown as DiveProfile

describe('extendPo2CalculatedToBoundary', () => {
  it('returns an empty series unchanged', () => {
    const profile = profileOf([], 100)
    expect(extendPo2CalculatedToBoundary([], profile)).toEqual([])
  })

  it('extends the last point to the profile end when there is no OC bailout', () => {
    const profile = profileOf([[0, 'CC']], 100)
    const result = extendPo2CalculatedToBoundary([[10, 1.2]], profile)
    expect(result).toEqual([
      [10, 1.2],
      [100, 1.2],
    ])
  })

  it('extends only up to the first OC bailout after the last sample, not the full dive', () => {
    const profile = profileOf(
      [
        [0, 'CC'],
        [50, 'OC'],
      ],
      100,
    )
    const result = extendPo2CalculatedToBoundary([[10, 1.2]], profile)
    expect(result).toEqual([
      [10, 1.2],
      [50, 1.2],
    ])
  })

  it('ignores an OC transition that happened before the last sample', () => {
    const profile = profileOf(
      [
        [0, 'OC'],
        [5, 'CC'],
      ],
      100,
    )
    const result = extendPo2CalculatedToBoundary([[10, 1.2]], profile)
    expect(result).toEqual([
      [10, 1.2],
      [100, 1.2],
    ])
  })

  it('does not add a duplicate/backwards point when the last sample is already at the boundary', () => {
    const profile = profileOf([[0, 'CC']], 10)
    const result = extendPo2CalculatedToBoundary([[10, 1.2]], profile)
    expect(result).toEqual([[10, 1.2]])
  })
})
