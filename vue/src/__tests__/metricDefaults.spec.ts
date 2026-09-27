import { describe, it, expect } from 'vitest'
import {
  applyMetricPreferences,
  computeSensibleMetricDefaults,
  selectBestPo2Source,
  type MetricPreferences,
  type RememberedMetric,
} from '@/lib/graph/metricDefaults'
import type { ProfileMetricCounts } from '@/composables/useDiveGraphMetrics'

const EMPTY: ProfileMetricCounts = {
  temp: 0,
  ndl: 0,
  tts: 0,
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
  ccSamples: 0,
}

function counts(overrides: Partial<ProfileMetricCounts>): ProfileMetricCounts {
  return { ...EMPTY, ...overrides }
}

describe('computeSensibleMetricDefaults', () => {
  it('defaults a metric off when no profile has any data for it', () => {
    const result = computeSensibleMetricDefaults([counts({})])

    expect(result.show.temp).toBe(false)
    expect(result.extraProfileMetrics).toEqual({})
    expect(result.po2Selection).toBeNull()
  })

  it('defaults a metric on when the primary profile itself has data', () => {
    const result = computeSensibleMetricDefaults([counts({ temp: 120 })])

    expect(result.show.temp).toBe(true)
  })

  it('does not enable a metric on the primary row just because a secondary profile has it', () => {
    const result = computeSensibleMetricDefaults([counts({}), counts({ temp: 5 })])

    expect(result.show.temp).toBe(false)
    expect(result.extraProfileMetrics).toEqual({ 1: { temp: true } })
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

  it('defaults deco (Deco Ceiling) on whenever the primary profile has deco data, same as any other data-driven metric', () => {
    const withData = computeSensibleMetricDefaults([counts({ deco: 5 })])
    expect(withData.show.deco).toBe(true)

    const withoutData = computeSensibleMetricDefaults([counts({})])
    expect(withoutData.show.deco).toBe(false)
  })

  it('never mentions the gas-fraction metrics - always handled separately, off by default', () => {
    const result = computeSensibleMetricDefaults([counts({ gasO2: 100, gasN2: 100, gasHe: 100 })])

    expect(result.show).not.toHaveProperty('gasO2')
    expect(result.show).not.toHaveProperty('gasN2')
    expect(result.show).not.toHaveProperty('gasHe')
  })

  it('never mentions the PO2 family in `show` - handled entirely via po2Selection', () => {
    const result = computeSensibleMetricDefaults([
      counts({ po2Measured: 200, po2Calculated: 200, po2Setpoint: 200 }),
    ])

    expect(result.show).not.toHaveProperty('po2Measured')
    expect(result.show).not.toHaveProperty('po2Calculated')
    expect(result.show).not.toHaveProperty('po2Setpoint')
  })

  it('opts a secondary profile into extraProfileMetrics when it is the selected best PO2 source', () => {
    const result = computeSensibleMetricDefaults([counts({}), counts({ po2Measured: 200 })])

    expect(result.po2Selection).toEqual({ profileIdx: 1, metric: 'po2Measured' })
    expect(result.extraProfileMetrics).toEqual({ 1: { po2Measured: true } })
  })

  it('picks only the winning PO2 metric, not every metric a profile happens to have', () => {
    const result = computeSensibleMetricDefaults([
      counts({}),
      counts({ po2Calculated: 200, po2Measured: 150 }),
    ])

    // Measured beats calculated even though calculated has more raw samples - a real sensor
    // reading always outranks a derived one.
    expect(result.po2Selection).toEqual({ profileIdx: 1, metric: 'po2Measured' })
    expect(result.extraProfileMetrics).toEqual({ 1: { po2Measured: true } })
  })
})

describe('selectBestPo2Source', () => {
  it('returns null when no profile has usable PO2 data', () => {
    expect(selectBestPo2Source([counts({}), counts({})])).toBeNull()
  })

  it('ignores a single stray sample - needs more than one point to count as real data', () => {
    expect(selectBestPo2Source([counts({ po2Measured: 1 })])).toBeNull()
  })

  it('prefers measured PO2 over calculated even when calculated has far more samples', () => {
    const result = selectBestPo2Source([counts({ po2Measured: 10, po2Calculated: 500 })])

    expect(result).toEqual({ profileIdx: 0, metric: 'po2Measured' })
  })

  it('picks the richest profile among multiple with measured PO2 (e.g. redundant handsets)', () => {
    const result = selectBestPo2Source([
      counts({ po2Measured: 50 }),
      counts({ po2Measured: 400 }),
      counts({ po2Measured: 120 }),
    ])

    expect(result).toEqual({ profileIdx: 1, metric: 'po2Measured' })
  })

  it('falls back to calculated PO2 when no profile has measured PO2', () => {
    const result = selectBestPo2Source([counts({ po2Calculated: 30 }), counts({ po2Calculated: 5 })])

    expect(result).toEqual({ profileIdx: 0, metric: 'po2Calculated' })
  })
})

describe('applyMetricPreferences', () => {
  // What each profile has data for (index 0 = primary).
  const has =
    (...metrics: RememberedMetric[]) =>
    (metric: RememberedMetric) =>
      metrics.includes(metric)
  const none: MetricPreferences = { primary: {}, secondary: {} }

  it('keeps the data-driven defaults for metrics the diver never touched', () => {
    const defaults = computeSensibleMetricDefaults([counts({ temp: 5, tts: 5 })])
    const applied = applyMetricPreferences(defaults, none, [has('temp', 'tts')])
    expect(applied.show.temp).toBe(true)
    expect(applied.show.tts).toBe(true)
    expect(applied.show.gasO2).toBe(false)
  })

  it("brings back the diver's choices, but only where this dive has the data", () => {
    const defaults = computeSensibleMetricDefaults([counts({ temp: 5, tts: 5 })])
    const prefs: MetricPreferences = {
      primary: { tts: false, gasO2: true, cns: true },
      secondary: {},
    }
    const applied = applyMetricPreferences(defaults, prefs, [has('temp', 'tts', 'gasO2')])
    expect(applied.show.tts).toBe(false) // turned off by the diver, despite data
    expect(applied.show.gasO2).toBe(true) // turned on by the diver, data present
    expect(applied.show.cns).toBe(false) // wanted, but this dive has no CNS
  })

  it('opts secondary profiles into a remembered metric when they have its data', () => {
    const defaults = computeSensibleMetricDefaults([
      counts({ temp: 5 }),
      counts({ temp: 5, ndl: 5 }),
      counts({ temp: 5 }),
    ])
    const prefs: MetricPreferences = { primary: {}, secondary: { temp: true, ndl: false } }
    const applied = applyMetricPreferences(defaults, prefs, [
      has('temp'),
      has('temp', 'ndl'),
      has('temp'),
    ])
    // ndl's richer-secondary default is overridden by the remembered "off".
    expect(applied.extraProfileMetrics).toEqual({ 1: { temp: true }, 2: { temp: true } })
  })

  it('shows a remembered PO2 line only on the dive\'s selected PO2 source', () => {
    const defaults = computeSensibleMetricDefaults([
      counts({ po2Calculated: 10 }),
      counts({ po2Measured: 10 }),
    ])
    const prefs: MetricPreferences = {
      primary: { po2Calculated: true },
      secondary: { po2Measured: true },
    }
    const applied = applyMetricPreferences(defaults, prefs, [
      has('po2Calculated'),
      has('po2Measured'),
    ])
    expect(applied.show.po2Calculated).toBe(false) // measured on profile 2 is the source
    expect(applied.extraProfileMetrics[1]).toEqual({ po2Measured: true })
  })
})
