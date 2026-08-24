import type { DiveProfile } from '@/lib/types/dive'

/**
 * The closest real measurement's time to `targetTime`, so a dragged trim handle always lands on
 * an actual sample instead of an arbitrary interpolated point between two of them - the exact cut
 * point stops being ambiguous to look at, and the live range stats line up with a real point.
 * O(n) per call (no assumption of sorted input, matching `detectTrimSuggestion`'s own caution) -
 * fine at drag-tick frequency even for a long multi-hour profile.
 */
export function nearestSampleTime(profile: DiveProfile, targetTime: number): number {
  let nearest = targetTime
  let nearestDiff = Infinity
  for (const { measurement } of profile.measurements) {
    const diff = Math.abs(measurement.time - targetTime)
    if (diff < nearestDiff) {
      nearest = measurement.time
      nearestDiff = diff
    }
  }
  return nearest
}
