import { describe, it, expect } from 'vitest'
import {
  toRatePoints,
  rateTier,
  SLOW_RATE_M_PER_MIN,
  NORMAL_RATE_M_PER_MIN,
  QUICK_RATE_M_PER_MIN,
} from '@/lib/graph/ascentRate'
import type { DiveProfileRatesResponse } from '@/lib/types/dive'

describe('toRatePoints', () => {
  it('returns an empty array for a missing response', () => {
    expect(toRatePoints(null)).toEqual([])
    expect(toRatePoints(undefined)).toEqual([])
  })

  it('maps the backend response straight through without recomputing anything', () => {
    const response: DiveProfileRatesResponse = {
      profileId: 1,
      rates: [
        { time: 0, depth: 0, rateMetersPerMinute: 0 },
        { time: 5000, depth: 1, rateMetersPerMinute: 12 },
        { time: 10000, depth: 2, rateMetersPerMinute: -6 },
      ],
    }
    expect(toRatePoints(response)).toEqual([
      { time: 0, rate: 0 },
      { time: 5000, rate: 12 },
      { time: 10000, rate: -6 },
    ])
  })
})

describe('rateTier', () => {
  it('classifies below the slow threshold as slow, in either direction', () => {
    expect(rateTier(0)).toBe('slow')
    expect(rateTier(SLOW_RATE_M_PER_MIN - 0.1)).toBe('slow')
    expect(rateTier(-(SLOW_RATE_M_PER_MIN - 0.1))).toBe('slow')
  })

  it('classifies between the slow and normal thresholds as normal', () => {
    expect(rateTier(SLOW_RATE_M_PER_MIN + 0.1)).toBe('normal')
    expect(rateTier(NORMAL_RATE_M_PER_MIN - 0.1)).toBe('normal')
  })

  it('classifies between the normal and quick thresholds as quick', () => {
    expect(rateTier(NORMAL_RATE_M_PER_MIN + 0.1)).toBe('quick')
    expect(rateTier(QUICK_RATE_M_PER_MIN - 0.1)).toBe('quick')
  })

  it('classifies above the quick threshold as extreme, in either direction', () => {
    expect(rateTier(QUICK_RATE_M_PER_MIN + 0.1)).toBe('extreme')
    expect(rateTier(-(QUICK_RATE_M_PER_MIN + 0.1))).toBe('extreme')
  })
})
