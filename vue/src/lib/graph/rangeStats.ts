import type { DiveProfile, TimeRange } from '@/lib/types/dive'
import { isKept, totalDuration, trimGaps } from '@/lib/graph/profileCuts'

export type RangeStats = {
  maxDepth: number
  averageDepth: number
  /** Elapsed time between the first and last measurement actually inside the range, in seconds -
   * not `end - start` themselves, since the range's own bounds rarely land exactly on a sample -
   * minus the gaps cuts leave (see profileCuts). */
  bottomTimeSeconds: number
  measurementCount: number
}

/**
 * Live stats for whatever sub-range of a profile is currently selected while trimming - the same
 * shape of numbers `DiveProfileSummary` reports for the whole profile, recomputed for just the
 * dragged selection so the UI can show what the trimmed result would actually look like before
 * anything is deleted. Pure and cheap enough to call on every drag tick (a single pass over the
 * profile's measurements).
 */
export function computeRangeStats(
  profile: DiveProfile,
  startTime: number,
  endTime: number,
  cuts: TimeRange[] = [],
): RangeStats | null {
  let maxDepth = -Infinity
  let depthSum = 0
  let count = 0
  let firstTime: number | null = null
  let lastTime: number | null = null

  for (const { measurement } of profile.measurements) {
    if (!isKept(measurement.time, startTime, endTime, cuts)) continue
    count++
    depthSum += measurement.depth
    if (measurement.depth > maxDepth) maxDepth = measurement.depth
    if (firstTime === null || measurement.time < firstTime) firstTime = measurement.time
    if (lastTime === null || measurement.time > lastTime) lastTime = measurement.time
  }

  if (count === 0 || firstTime === null || lastTime === null) return null

  return {
    maxDepth,
    averageDepth: depthSum / count,
    bottomTimeSeconds:
      (lastTime - firstTime - totalDuration(trimGaps(profile, startTime, endTime, cuts))) / 1000,
    measurementCount: count,
  }
}
