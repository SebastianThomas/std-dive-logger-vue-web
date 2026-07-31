import type { DiveProfileRatesResponse } from '@/lib/types/dive'

// Four-tier speed scale (m/min, by magnitude, direction-agnostic): under 3 reads as essentially
// no concern ("slow"), 3-9 is ordinary swimming pace ("normal" — notably worth watching once
// shallow, since percentage pressure change is steepest near the surface), 9-18 is brisk enough
// to warrant attention ("quick"), and over 18 is squarely outside normal recreational practice —
// very fast for a descent, and outright dangerous for an ascent (rapid decompression risk).
// These are common-guideline reference values for the visualization, not medical thresholds.
// SLOW_RATE_M_PER_MIN also happens to be the exact threshold the backend uses to tell a real
// ascent/descent apart from a HOLD_LEVEL — so "slow" here lines up with "backend says you're
// holding" rather than being an independent, possibly-conflicting cutoff.
export const SLOW_RATE_M_PER_MIN = 3
export const NORMAL_RATE_M_PER_MIN = 9
export const QUICK_RATE_M_PER_MIN = 18

export type RateTier = 'slow' | 'normal' | 'quick' | 'extreme'

export function rateTier(rate: number): RateTier {
  const abs = Math.abs(rate)
  if (abs > QUICK_RATE_M_PER_MIN) return 'extreme'
  if (abs > NORMAL_RATE_M_PER_MIN) return 'quick'
  if (abs > SLOW_RATE_M_PER_MIN) return 'normal'
  return 'slow'
}

export const RATE_TIER_COLORS: Record<RateTier, string> = {
  slow: '#3b82f6',
  normal: '#22c55e',
  quick: '#f59e0b',
  extreme: '#dc2626',
}

export const RATE_TIER_LABELS: Record<RateTier, string> = {
  slow: 'slow',
  normal: 'normal',
  quick: 'quick',
  extreme: 'very fast',
}

export type RatePoint = { time: number; rate: number }

/**
 * Adapts the backend's already-computed, already-smoothed rate (see
 * `DiveProfileRateCalculator`/`DiveProfileSegmenter` on the backend — the same numbers segment
 * classification itself is based on) into the shape this graph draws. The rate is not
 * recomputed here: doing the regression/smoothing twice, once server-side for segmentation and
 * once client-side for this chart, risked the two disagreeing about where an ascent/descent
 * actually started.
 */
export function toRatePoints(response: DiveProfileRatesResponse | undefined | null): RatePoint[] {
  if (!response) return []
  return response.rates
    .map((r) => ({ time: r.time, rate: r.rateMetersPerMinute }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.rate))
}
