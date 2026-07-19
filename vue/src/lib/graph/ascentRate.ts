import type { DiveProfile } from '@/lib/types/dive'

// Widely-used recreational dive computer guideline values (e.g. Suunto/PADI-style defaults):
// a "safe" ascent/descent rate around 10 m/min, with most computers starting to warn somewhere
// around 15-20 m/min. These are reference lines for the visualization, not medical thresholds.
export const SAFE_RATE_M_PER_MIN = 10
export const WARN_RATE_M_PER_MIN = 18

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

export function rateSeverity(rate: number): 'safe' | 'warn' | 'danger' {
  const abs = Math.abs(rate)
  if (abs > WARN_RATE_M_PER_MIN) return 'danger'
  if (abs > SAFE_RATE_M_PER_MIN) return 'warn'
  return 'safe'
}
