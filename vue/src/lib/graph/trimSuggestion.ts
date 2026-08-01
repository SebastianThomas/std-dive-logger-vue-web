import type { DiveMeasurementWithId, DiveProfile } from '@/lib/types/dive'

// Matches the backend's own "surface" depth threshold (DiveProfileSegmenter.SURFACE_DEPTH_METERS)
// so a suggested trim always lines up with what the app already considers "at the surface" -
// comfortably covers the 0.3-0.6m tails a Divesoft Liberty logs while the diver waits to end the
// dive manually (it only ends once ended by hand on the computer), without risking flagging a
// real shallow safety stop (typically 3m+) as a trim candidate.
export const TRIM_SUGGESTION_SURFACE_DEPTH_METERS = 1.0

// Below this, a near-surface stretch reads as ordinary noise (a wave briefly lifting the diver,
// or a brief pause before descending) rather than a genuine "the dive has effectively ended, this
// is just waiting to end it on the computer" tail worth suggesting a trim for.
const MIN_TRIM_SUGGESTION_DURATION_MS = 60_000

export type TrimSuggestion = {
  /** Suggested time to cut everything strictly after, if a leading near-surface stretch was
   * found before the dive properly starts. Null if there's nothing worth suggesting. */
  suggestedStart: number | null
  /** Suggested time to cut everything at-or-after, if a trailing near-surface tail was found.
   * Null if there's nothing worth suggesting. */
  suggestedEnd: number | null
}

const NO_SUGGESTION: TrimSuggestion = { suggestedStart: null, suggestedEnd: null }

/**
 * Looks for a sustained near-surface stretch at the very start and/or end of a profile's own
 * measurements - not a substitute for the safety-stop-aware segment classification used
 * elsewhere, just a purely time/depth-based heuristic scoped to the two ends of the recording.
 * Deliberately conservative: a single noisy deep-looking sample within an otherwise shallow tail
 * moves the suggested cut to just after it rather than skipping over it, so this can under-trim
 * but should never suggest cutting into real dive data. This is only ever a suggestion the user
 * reviews before anything is deleted - see the manual trim UI that consumes it.
 */
export function detectTrimSuggestion(profile: DiveProfile): TrimSuggestion {
  const measurements = [...profile.measurements].sort(
    (a, b) => a.measurement.time - b.measurement.time,
  )
  if (measurements.length < 2) return NO_SUGGESTION

  const isDeep = (m: DiveMeasurementWithId): boolean =>
    m.measurement.depth > TRIM_SUGGESTION_SURFACE_DEPTH_METERS

  let firstDeepIdx = -1
  let lastDeepIdx = -1
  for (let i = 0; i < measurements.length; i++) {
    if (isDeep(measurements[i]!)) {
      if (firstDeepIdx === -1) firstDeepIdx = i
      lastDeepIdx = i
    }
  }
  // Nothing in the profile ever reads as "real depth" - nothing to distinguish a tail from, so
  // there's no basis for a suggestion either way.
  if (firstDeepIdx === -1) return NO_SUGGESTION

  let suggestedStart: number | null = null
  if (firstDeepIdx > 0) {
    const leadStart = measurements[0]!.measurement.time
    const leadEnd = measurements[firstDeepIdx - 1]!.measurement.time
    if (leadEnd - leadStart >= MIN_TRIM_SUGGESTION_DURATION_MS) {
      suggestedStart = leadEnd
    }
  }

  let suggestedEnd: number | null = null
  if (lastDeepIdx < measurements.length - 1) {
    const tailStart = measurements[lastDeepIdx + 1]!.measurement.time
    const tailEnd = measurements[measurements.length - 1]!.measurement.time
    if (tailEnd - tailStart >= MIN_TRIM_SUGGESTION_DURATION_MS) {
      suggestedEnd = tailStart
    }
  }

  return { suggestedStart, suggestedEnd }
}
