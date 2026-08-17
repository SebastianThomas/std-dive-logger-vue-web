/**
 * Splits a sequence of [time, value] points (sorted by time) into separate runs wherever two
 * consecutive points are further apart than `maxGapMs`. Used so a drawn line doesn't visually
 * connect two points across a real gap in what was actually recorded - a straight (or stepped)
 * line between them implies a smooth transition that never happened, when the truth is "no data
 * for a while, then a resumed reading" (e.g. NDL, excluded entirely while in mandatory deco).
 */
export function splitByTimeGap(
  points: [number, number][],
  maxGapMs: number,
): [number, number][][] {
  if (points.length === 0) return []
  const segments: [number, number][][] = [[points[0]!]]
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    if (curr[0] - prev[0] > maxGapMs) {
      segments.push([])
    }
    segments[segments.length - 1]!.push(curr)
  }
  return segments
}

/**
 * A profile's typical (median) time between consecutive measurements, in ms - the basis for how
 * big a gap has to be before a line is considered "broken" rather than just unevenly sampled.
 * Median (not mean) so a handful of unusually long or short intervals (e.g. around a trim point)
 * don't skew what counts as "normal" for the rest of the profile.
 */
export function medianSampleIntervalMs(times: number[]): number {
  if (times.length < 2) return 0
  const sorted = [...times].sort((a, b) => a - b)
  const deltas: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    deltas.push(sorted[i]! - sorted[i - 1]!)
  }
  deltas.sort((a, b) => a - b)
  const mid = Math.floor(deltas.length / 2)
  return deltas.length % 2 === 0 ? (deltas[mid - 1]! + deltas[mid]!) / 2 : deltas[mid]!
}
