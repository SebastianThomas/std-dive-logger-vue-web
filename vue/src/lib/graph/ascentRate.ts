import type { DiveProfile } from '@/lib/types/dive'

// Four-tier speed scale (m/min, by magnitude, direction-agnostic): under 3 reads as essentially
// no concern ("slow"), 3-9 is ordinary swimming pace ("normal" — notably worth watching once
// shallow, since percentage pressure change is steepest near the surface), 9-18 is brisk enough
// to warrant attention ("quick"), and over 18 is squarely outside normal recreational practice —
// very fast for a descent, and outright dangerous for an ascent (rapid decompression risk).
// These are common-guideline reference values for the visualization, not medical thresholds.
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

const MIN_HALF_WINDOW_MS = 6_000
const MAX_HALF_WINDOW_MS = 30_000
const WINDOW_STEP_MS = 2_000
const MIN_POINTS_IN_WINDOW = 4
const NOISE_FLOOR_M = 0.5

export type RatePoint = { time: number; rate: number }

/**
 * Estimates a local ascent/descent rate (m/min, positive = descending) at every measurement in
 * a profile, using a time window centered on each sample rather than a fixed sample count — so
 * it self-adapts to whatever a dive computer's actual logging interval happens to be (1s vs 10s
 * vs 30s all just naturally include more or fewer samples in the same time window).
 *
 * The window itself is also adaptive: it starts small and only grows until it both spans enough
 * samples AND enough depth change to rise above sensor noise. Practically, this means the window
 * stays tight during a fast ascent/descent (so the peak rate isn't smoothed away by neighboring
 * flat time) and grows during a stable, flat stretch (so near-zero noise averages out instead of
 * jittering around a fake rate). The slope itself is a least-squares linear regression over the
 * final window rather than a naive two-point difference, for extra noise robustness.
 */
export function computeAscentRates(profile: DiveProfile): RatePoint[] {
  const points = profile.measurements
  const n = points.length
  if (n < 2) return []

  const timeAt = (idx: number): number => points[idx]!.measurement.time
  const depthAt = (idx: number): number => points[idx]!.measurement.depth

  const depthRangeIn = (lo: number, hi: number): number => {
    let min = Infinity
    let max = -Infinity
    for (let k = lo; k <= hi; k++) {
      const d = depthAt(k)
      if (d < min) min = d
      if (d > max) max = d
    }
    return max - min
  }

  const result: RatePoint[] = []

  for (let i = 0; i < n; i++) {
    const t = timeAt(i)
    let lo = i
    let hi = i
    let halfWindow = MIN_HALF_WINDOW_MS

    const expandTo = (half: number): void => {
      while (lo > 0 && t - timeAt(lo - 1) <= half) lo--
      while (hi < n - 1 && timeAt(hi + 1) - t <= half) hi++
    }

    expandTo(halfWindow)
    while (
      halfWindow < MAX_HALF_WINDOW_MS &&
      !(lo === 0 && hi === n - 1) &&
      (hi - lo + 1 < MIN_POINTS_IN_WINDOW || depthRangeIn(lo, hi) < NOISE_FLOOR_M)
    ) {
      halfWindow += WINDOW_STEP_MS
      expandTo(halfWindow)
    }

    if (hi === lo) {
      result.push({ time: t, rate: 0 })
      continue
    }

    // Least-squares slope of depth over time within [lo, hi], time centered on `t` for
    // numerical stability.
    let sumT = 0
    let sumD = 0
    let sumTT = 0
    let sumTD = 0
    const count = hi - lo + 1
    for (let k = lo; k <= hi; k++) {
      const dt = timeAt(k) - t
      const d = depthAt(k)
      sumT += dt
      sumD += d
      sumTT += dt * dt
      sumTD += dt * d
    }
    const denom = count * sumTT - sumT * sumT
    const slopePerMs =
      denom !== 0
        ? (count * sumTD - sumT * sumD) / denom
        : (depthAt(hi) - depthAt(lo)) / (timeAt(hi) - timeAt(lo))

    result.push({ time: t, rate: slopePerMs * 60_000 })
  }

  return result
}
