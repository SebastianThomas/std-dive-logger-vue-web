import type { Dive, DiveProfile, DiveProfileSummary } from '@/lib/types/dive'
import { formatElapsedTime } from '@/lib/utils/timeUtils'

/**
 * Card-level (CNS / OTU / GF99 …) figures on a multi-profile dive must come from the first / last
 * profile that actually *has* that metric - `profiles[0]` / `profiles[last]` is wrong when a backup
 * computer without the metric happens to sort first or last. And when the profile data spans far
 * less than the logged dive, the figure is flagged as incomplete.
 */

/** Fraction of the dive duration the applicable profile data must span before a figure is flagged. */
export const COVERAGE_WARN_RATIO = 0.9

type Selector<T> = (summary: DiveProfileSummary) => T | null | undefined

const present = <T>(v: T | null | undefined): v is T => v != null

/** The profile with a value for `select`, earliest by profile start. */
export function firstApplicable<T>(
  profiles: DiveProfile[],
  select: Selector<T>,
): DiveProfile | null {
  return (
    profiles
      .filter((p) => present(select(p.summary)))
      .sort((a, b) => a.summary.start - b.summary.start)[0] ?? null
  )
}

/** The profile with a value for `select`, latest by profile end. */
export function lastApplicable<T>(profiles: DiveProfile[], select: Selector<T>): DiveProfile | null {
  return (
    profiles
      .filter((p) => present(select(p.summary)))
      .sort((a, b) => b.summary.end - a.summary.end)[0] ?? null
  )
}

export type MetricCoverage<T> = {
  /** Reading from the first applicable profile. */
  startValue: T | null
  /** Reading from the last applicable profile. */
  endValue: T | null
  /** Span of the applicable profile data (first-applicable start → last-applicable end). */
  coveredMs: number
  diveMs: number
  ratio: number
  incomplete: boolean
}

/**
 * Resolves a start/end pair (e.g. `startCNS` / `endCNS`) against the applicable profiles and
 * measures how much of the dive the data spans. Pass the same selector twice for a single-value
 * metric (e.g. OTU) - `endValue` is then the one to show.
 */
export function metricCoverage<T>(
  profiles: DiveProfile[],
  selectStart: Selector<T>,
  selectEnd: Selector<T>,
  dive: Pick<Dive, 'summary'>,
): MetricCoverage<T> {
  const first = firstApplicable(profiles, selectStart)
  const last = lastApplicable(profiles, selectEnd)
  const from = first?.summary.start ?? null
  const to = last?.summary.end ?? null
  const diveMs = Math.max(0, dive.summary.end - dive.summary.start)
  const coveredMs = from != null && to != null ? Math.max(0, to - from) : 0
  const ratio = diveMs > 0 ? Math.min(1, coveredMs / diveMs) : 1
  return {
    startValue: first ? (selectStart(first.summary) ?? null) : null,
    endValue: last ? (selectEnd(last.summary) ?? null) : null,
    coveredMs,
    diveMs,
    ratio,
    incomplete: (first != null || last != null) && ratio < COVERAGE_WARN_RATIO,
  }
}

/** Warning text for a card whose profile data doesn't span the whole dive; `null` when it does. */
export function coverageNote<T>(coverage: MetricCoverage<T>): string | null {
  if (!coverage.incomplete || coverage.diveMs <= 0) return null
  return (
    `Profile data covers ${formatElapsedTime(coverage.coveredMs, 0)} of the ` +
    `${formatElapsedTime(coverage.diveMs, 0)} dive — this figure may be incomplete.`
  )
}
