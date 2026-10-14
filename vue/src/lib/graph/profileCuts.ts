import type { DiveProfile, TimeRange } from '@/lib/types/dive'
import { TRIM_SUGGESTION_SURFACE_DEPTH_METERS } from '@/lib/graph/trimSuggestion'

// Mirrors the backend's ProfileCuts: a cut keeps the real clock and leaves a gap from the last
// kept sample before it to the first after it - only when it removed a sample.

const MIN_SURFACE_SECTION_MS = 60_000

const inRange = (t: number, r: TimeRange): boolean => t >= r.start && t <= r.end

export function isKept(t: number, start: number, end: number, cuts: TimeRange[]): boolean {
  return t >= start && t <= end && !cuts.some((c) => inRange(t, c))
}

/** Sorted, with overlapping or touching ranges joined. */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const merged: TimeRange[] = []
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else merged.push({ ...r })
  }
  return merged
}

/** The gaps a trim of `profile` to [start, end] minus `cuts` would leave (existing ones too). */
export function trimGaps(
  profile: DiveProfile,
  start: number,
  end: number,
  cuts: TimeRange[],
): TimeRange[] {
  const times = profile.measurements.map((m) => m.measurement.time).sort((a, b) => a - b)
  const kept = times.filter((t) => isKept(t, start, end, cuts))
  if (kept.length < 2) return []
  const first = kept[0]!
  const last = kept[kept.length - 1]!
  const gaps: TimeRange[] = []
  for (const cut of cuts) {
    if (!times.some((t) => inRange(t, cut))) continue
    const before = kept.filter((t) => t < cut.start).pop()
    const after = kept.find((t) => t > cut.end)
    if (before !== undefined && after !== undefined) gaps.push({ start: before, end: after })
  }
  for (const gap of profile.gaps ?? []) {
    const s = Math.max(gap.start, first)
    const e = Math.min(gap.end, last)
    if (s < e) gaps.push({ start: s, end: e })
  }
  return mergeRanges(gaps)
}

export const totalDuration = (ranges: TimeRange[]): number =>
  ranges.reduce((sum, r) => sum + (r.end - r.start), 0)

/**
 * Where a new cut should go: the longest stretch at the surface between two deeper parts of the
 * kept range (a mid-dive surface section), else the middle tenth of its samples - by sample, so
 * it never lands in an earlier cut's gap.
 */
export function suggestCut(profile: DiveProfile, start: number, end: number): TimeRange {
  const samples = profile.measurements
    .map((m) => m.measurement)
    .filter((m) => m.time >= start && m.time <= end)
    .sort((a, b) => a.time - b.time)
  let best: TimeRange | null = null
  let runStart: number | null = null
  let seenDeep = false
  for (let i = 0; i < samples.length; i++) {
    const m = samples[i]!
    if (m.depth > TRIM_SUGGESTION_SURFACE_DEPTH_METERS) {
      const prev = samples[i - 1]
      if (seenDeep && runStart !== null && prev) {
        const run = { start: runStart, end: prev.time }
        if (
          run.end - run.start >= MIN_SURFACE_SECTION_MS &&
          (!best || run.end - run.start > best.end - best.start)
        ) {
          best = run
        }
      }
      seenDeep = true
      runStart = null
    } else if (runStart === null) {
      runStart = m.time
    }
  }
  if (best) return best
  const mid = Math.floor(samples.length / 2)
  const half = Math.max(1, Math.floor(samples.length / 20))
  const from = samples[Math.max(0, mid - half)]?.time ?? start
  const to = samples[Math.min(samples.length - 1, mid + half)]?.time ?? end
  return to > from ? { start: from, end: to } : { start, end }
}

/** Depth points with a NaN break inside each gap, for a line generator using `.defined()`. */
export function withGapBreaks(
  points: [number, number][],
  gaps: TimeRange[] | undefined,
): [number, number][] {
  if (!gaps?.length) return points
  const breaks = gaps.map((g): [number, number] => [(g.start + g.end) / 2, Number.NaN])
  return [...points, ...breaks].sort((a, b) => a[0] - b[0])
}
