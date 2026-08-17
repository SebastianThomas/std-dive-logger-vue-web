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
      ndl: '',
      deco: [],
      ...overrides,
    },
  }
}

describe('EXTRACTORS.ndl', () => {
  it('extracts a point when NDL is reported and there is no active deco obligation', () => {
    const m = measurement(0, { ndl: 'PT12M' })
    expect(EXTRACTORS.ndl(m)).toEqual([0, 12])
  })

  it('excludes the sample entirely while in mandatory deco, even if ndl is reported as 0', () => {
    // NDL is inapplicable once you're already past it - a reported "0" here means "in deco", not
    // a real countdown value, so it must not be drawn as a data point.
    const m = measurement(0, { ndl: 'PT0M', deco: [{ type: 'deco', depth: 6, seconds: 60 }] })
    expect(EXTRACTORS.ndl(m)).toBeNull()
  })

  it('extracts a point once deco clears again, even with an empty deco array', () => {
    const m = measurement(0, { ndl: 'PT99M', deco: [] })
    expect(EXTRACTORS.ndl(m)).toEqual([0, 99])
  })

  it('excludes a sample with no ndl string reported at all', () => {
    const m = measurement(0, { ndl: '' })
    expect(EXTRACTORS.ndl(m)).toBeNull()
  })
})
