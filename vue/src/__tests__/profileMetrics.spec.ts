import { describe, it, expect } from 'vitest'
import {
  firstApplicable,
  lastApplicable,
  metricCoverage,
  coverageNote,
  COVERAGE_WARN_RATIO,
} from '@/lib/dive/profileMetrics'
import type { Dive, DiveProfile, DiveProfileSummary } from '@/lib/types/dive'

const HOUR = 3_600_000

const profile = (
  start: number,
  end: number,
  summaryOver: Partial<DiveProfileSummary> = {},
): DiveProfile =>
  ({
    id: start,
    diveComputer: { customIdentifier: 'X' },
    start,
    end,
    measurements: [],
    summary: { start, end, averageDepth: 10, maxDepth: 20, bottomTime: 'PT40M', ...summaryOver },
  }) as unknown as DiveProfile

const dive = (start: number, end: number): Pick<Dive, 'summary'> =>
  ({ summary: { start, end } }) as unknown as Pick<Dive, 'summary'>

describe('firstApplicable / lastApplicable', () => {
  it('skip profiles that lack the metric, and order by start / end', () => {
    const a = profile(0, HOUR, {}) // no CNS
    const b = profile(HOUR, 2 * HOUR, { startCNS: 3, endCNS: 8 })
    const c = profile(2 * HOUR, 3 * HOUR, { startCNS: 8, endCNS: 12 })

    expect(firstApplicable([c, a, b], (s) => s.startCNS)).toBe(b)
    expect(lastApplicable([b, a, c], (s) => s.endCNS)).toBe(c)
  })

  it('return null when no profile has the metric', () => {
    expect(firstApplicable([profile(0, HOUR)], (s) => s.startCNS)).toBeNull()
  })
})

describe('metricCoverage', () => {
  it('reads start/end from the applicable profiles and flags incomplete coverage', () => {
    const short = profile(0, 5 * 60_000, { startCNS: 1, endCNS: 2 }) // 5 min of a 6 h dive
    const c = metricCoverage([short], (s) => s.startCNS, (s) => s.endCNS, dive(0, 6 * HOUR))

    expect(c.startValue).toBe(1)
    expect(c.endValue).toBe(2)
    expect(c.ratio).toBeLessThan(0.02)
    expect(c.incomplete).toBe(true)
    expect(coverageNote(c)).toMatch(/covers .* of the .* dive/)
  })

  it('is complete when the profile spans (almost) the whole dive', () => {
    const full = profile(0, 6 * HOUR - 60_000, { startCNS: 1, endCNS: 40 })
    const c = metricCoverage([full], (s) => s.startCNS, (s) => s.endCNS, dive(0, 6 * HOUR))

    expect(c.ratio).toBeGreaterThan(COVERAGE_WARN_RATIO)
    expect(c.incomplete).toBe(false)
    expect(coverageNote(c)).toBeNull()
  })

  it('spans first-applicable start to last-applicable end across profiles', () => {
    const p1 = profile(0, 3 * HOUR, { startCNS: 0 }) // has start only
    const p2 = profile(3 * HOUR, 6 * HOUR, { endCNS: 40 }) // has end only
    const c = metricCoverage([p1, p2], (s) => s.startCNS, (s) => s.endCNS, dive(0, 6 * HOUR))

    expect(c.startValue).toBe(0)
    expect(c.endValue).toBe(40)
    expect(c.incomplete).toBe(false) // together they span the whole dive
  })
})
