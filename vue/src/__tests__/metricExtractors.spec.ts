import { describe, it, expect } from 'vitest'
import { EXTRACTORS } from '@/lib/graph/metricExtractors'
import type { DiveMeasurementWithId } from '@/lib/types/dive'

function measurement(
  time: number,
  overrides: Partial<DiveMeasurementWithId['measurement']> = {},
): DiveMeasurementWithId {
  return {
    id: time,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth: 20,
      ndl: null,
      deco: [],
      ...overrides,
    },
  }
}

describe('EXTRACTORS.ndl', () => {
  it('extracts a point when NDL is reported and there is no active deco obligation', () => {
    const m = measurement(0, { ndl: 720000 })
    expect(EXTRACTORS.ndl(m)).toEqual([0, 12])
  })

  it('excludes the sample entirely while in mandatory deco, even if ndl is reported as 0', () => {
    // NDL is inapplicable once you're already past it - a reported "0" here means "in deco", not
    // a real countdown value, so it must not be drawn as a data point.
    const m = measurement(0, { ndl: null, deco: [{ type: 'deco', depth: 6, seconds: 60 }] })
    expect(EXTRACTORS.ndl(m)).toBeNull()
  })

  it('extracts a point once deco clears again, even with an empty deco array', () => {
    const m = measurement(0, { ndl: 5940000, deco: [] })
    expect(EXTRACTORS.ndl(m)).toEqual([0, 99])
  })

  it('excludes a sample with no NDL reported', () => {
    const m = measurement(0, { ndl: null })
    expect(EXTRACTORS.ndl(m)).toBeNull()
  })
  it('retains a numeric zero NDL when not in deco', () => {
    expect(EXTRACTORS.ndl(measurement(0, { ndl: 0, deco: [] }))).toEqual([0, 0])
  })
})
