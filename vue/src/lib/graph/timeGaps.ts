import type { DiveProfile } from '@/lib/types/dive'

export type TimeGap = { start: number; end: number }

// How much of the gap's own span survives as a "virtual" (compressed) width, expressed as a
// fraction of the dive's total *active* (non-gap) duration. A percentage rather than a fixed
// pixel/time width so the break reads as a consistent visual pause regardless of how long the
// dive itself is or how many gaps it has.
const VIRTUAL_GAP_FRACTION = 0.04

const sortedFiniteTimes = (times: (number | undefined)[]): number[] =>
  times.filter((t): t is number => typeof t === 'number' && Number.isFinite(t)).sort((a, b) => a - b)

/**
 * Finds "breaks" in a dive's combined timeline: stretches with no data that are disproportionate
 * relative to the data around them (e.g. two profiles from unrelated sessions merged onto one
 * dive, or a single profile with a long internal pause). References are each profile's own total
 * duration (a fixed, well-defined quantity) rather than incrementally-rebuilt segments, so a gap
 * only counts once it exceeds half of a profile's own time - literally "half a profile time" -
 * which a few seconds of missing samples in an otherwise-continuous multi-minute dive never does,
 * but a multi-day silence next to a 45-minute dive clearly does.
 */
export function detectTimeGaps(profiles: DiveProfile[]): TimeGap[] {
  const gaps: TimeGap[] = []

  // Internal pauses within a single profile, checked against that profile's own duration.
  for (const profile of profiles) {
    const times = sortedFiniteTimes(profile.measurements.map((m) => m.measurement.time))
    if (times.length < 2) continue
    const duration = times[times.length - 1]! - times[0]!
    for (let i = 1; i < times.length; i++) {
      const gap = times[i]! - times[i - 1]!
      if (gap > 0.5 * duration) {
        gaps.push({ start: times[i - 1]!, end: times[i]! })
      }
    }
  }

  // Gaps between profiles, checked against whichever of the two profiles is shorter.
  const ranges = profiles
    .map((p) => {
      const times = sortedFiniteTimes(p.measurements.map((m) => m.measurement.time))
      return times.length ? { min: times[0]!, max: times[times.length - 1]! } : null
    })
    .filter((r): r is { min: number; max: number } => r !== null)
    .sort((a, b) => a.min - b.min)

  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1]!
    const cur = ranges[i]!
    const gap = cur.min - prev.max
    if (gap <= 0) continue // overlapping profiles - not a gap
    const prevDuration = prev.max - prev.min
    const curDuration = cur.max - cur.min
    const reference = Math.min(prevDuration || Infinity, curDuration || Infinity)
    if (gap > 0.5 * reference) {
      gaps.push({ start: prev.max, end: cur.min })
    }
  }

  return gaps.sort((a, b) => a.start - b.start)
}

/** The complementary "has data" ranges between/around the gaps, for per-segment tick generation. */
export function getActiveSegments(gaps: TimeGap[], min: number, max: number): TimeGap[] {
  if (!gaps.length) return [{ start: min, end: max }]
  const sorted = [...gaps].sort((a, b) => a.start - b.start)
  const segments: TimeGap[] = []
  let cursor = min
  for (const g of sorted) {
    if (g.start > cursor) segments.push({ start: cursor, end: g.start })
    cursor = g.end
  }
  if (cursor < max) segments.push({ start: cursor, end: max })
  return segments
}

export type TimeMapper = {
  toVirtual: (t: number) => number
  toReal: (v: number) => number
  /** Virtual-time x-position of each gap's break marker (its midpoint), for drawing a break line. */
  breakPositions: number[]
}

const IDENTITY_MAPPER: TimeMapper = {
  toVirtual: (t) => t,
  toReal: (v) => v,
  breakPositions: [],
}

/**
 * Builds a monotonic real-time <-> virtual-time mapping that collapses each detected gap down to
 * a small fixed virtual width, so line/area generators and axes can keep using a plain linear
 * scale fed virtual instead of real time - no gap means every value passes through unchanged.
 */
export function buildVirtualTimeMapper(gaps: TimeGap[], allTimes: number[]): TimeMapper {
  if (!gaps.length || !allTimes.length) return IDENTITY_MAPPER

  const min = Math.min(...allTimes)
  const max = Math.max(...allTimes)
  const totalGapDuration = gaps.reduce((sum, g) => sum + (g.end - g.start), 0)
  const activeDuration = Math.max(1, max - min - totalGapDuration)
  const virtualGapWidth = activeDuration * VIRTUAL_GAP_FRACTION

  // toVirtual/toReal both walk this small sorted list directly (gaps.length is expected to be
  // tiny, a handful at most) rather than needing a precomputed lookup structure.
  const sorted = [...gaps].sort((a, b) => a.start - b.start)
  const breakPositions: number[] = []

  const toVirtual = (t: number): number => {
    let offsetReal = 0
    let offsetVirtual = 0
    for (const g of sorted) {
      if (t <= g.start) break
      if (t < g.end) {
        // Inside a gap: clamp proportionally within the compressed width rather than jumping.
        const frac = (t - g.start) / (g.end - g.start || 1)
        return g.start - offsetReal + offsetVirtual + frac * virtualGapWidth
      }
      offsetReal += g.end - g.start
      offsetVirtual += virtualGapWidth
    }
    return t - offsetReal + offsetVirtual
  }

  const toReal = (v: number): number => {
    let offsetReal = 0
    let offsetVirtual = 0
    for (const g of sorted) {
      const virtualStart = g.start - offsetReal + offsetVirtual
      if (v <= virtualStart) break
      if (v < virtualStart + virtualGapWidth) {
        const frac = (v - virtualStart) / (virtualGapWidth || 1)
        return g.start + frac * (g.end - g.start)
      }
      offsetReal += g.end - g.start
      offsetVirtual += virtualGapWidth
    }
    return v + offsetReal - offsetVirtual
  }

  for (const g of sorted) {
    breakPositions.push(toVirtual((g.start + g.end) / 2))
  }

  return { toVirtual, toReal, breakPositions }
}
