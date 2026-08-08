import { describe, it, expect } from 'vitest'
import { computeSensibleMetricDefaults } from '@/lib/graph/metricDefaults'
import type { ProfileMetricCounts } from '@/composables/useDiveGraphMetrics'

const EMPTY: ProfileMetricCounts = {
  temp: 0,
  ndl: 0,
  otu: 0,
  cns: 0,
  gf: 0,
  po2Measured: 0,
  po2Calculated: 0,
  po2Setpoint: 0,
  rmv: 0,
  gasO2: 0,
  gasN2: 0,
  gasHe: 0,
  deco: 0,
}

function counts(overrides: Partial<ProfileMetricCounts>): ProfileMetricCounts {
  return { ...EMPTY, ...overrides }
}

describe('computeSensibleMetricDefaults', () => {
  it('defaults a metric off when no profile has any data for it', () => {
    const result = computeSensibleMetricDefaults([counts({})])

    expect(result.show.po2Measured).toBe(false)
    expect(result.extraProfileMetrics).toEqual({})
  })

  it('defaults a metric on when the primary profile itself has data', () => {
    const result = computeSensibleMetricDefaults([counts({ temp: 120 })])

    expect(result.show.temp).toBe(true)
  })

  it('does not enable a metric on the primary row just because a secondary profile has it', () => {
    const result = computeSensibleMetricDefaults([counts({}), counts({ po2Measured: 200 })])

    expect(result.show.po2Measured).toBe(false)
    expect(result.extraProfileMetrics).toEqual({ 1: { po2Measured: true } })
  })

  it('prefers a secondary profile with far more data over a primary with only a few points', () => {
    const result = computeSensibleMetricDefaults([
      counts({ po2Calculated: 3 }),
      counts({ po2Calculated: 400 }),
    ])

    // Primary still shows its own (thin) line by default - it does have real data - but the
    // richer secondary is also opted in directly so it's the one actually worth looking at.
    expect(result.show.po2Calculated).toBe(true)
    expect(result.extraProfileMetrics).toEqual({ 1: { po2Calculated: true } })
  })

  it('does not opt in a secondary profile that has strictly less data than the primary', () => {
    const result = computeSensibleMetricDefaults([counts({ temp: 500 }), counts({ temp: 10 })])

    expect(result.show.temp).toBe(true)
    expect(result.extraProfileMetrics).toEqual({})
  })

  it('picks the single richest secondary profile across three, not every one that has some data', () => {
    const result = computeSensibleMetricDefaults([
      counts({ rmv: 0 }),
      counts({ rmv: 5 }),
      counts({ rmv: 300 }),
    ])

    expect(result.extraProfileMetrics).toEqual({ 2: { rmv: true } })
  })

  it('collects multiple metrics for the same opted-in secondary profile into one entry', () => {
    const result = computeSensibleMetricDefaults([
      counts({}),
      counts({ po2Calculated: 200, po2Measured: 150 }),
    ])

    expect(result.extraProfileMetrics).toEqual({
      1: { po2Calculated: true, po2Measured: true },
    })
  })

  it('never mentions the gas-fraction metrics - always handled separately, off by default', () => {
    const result = computeSensibleMetricDefaults([counts({ gasO2: 100, gasN2: 100, gasHe: 100 })])

    expect(result.show).not.toHaveProperty('gasO2')
    expect(result.show).not.toHaveProperty('gasN2')
    expect(result.show).not.toHaveProperty('gasHe')
  })
})
