import { bisector } from 'd3'
import type { MetricType } from '@/lib/types/graph'

/**
 * Linearly interpolates the value at time t from a sorted [time, value][] list - matching the
 * straight-line segments d3 draws between consecutive points (metric lines use the default
 * linear curve). Clamps to the first/last value outside the list's own range.
 */
export function interpolateAt(points: [number, number][] | undefined, t: number): number | undefined {
  if (!points || points.length === 0) return undefined
  if (points.length === 1 || t <= points[0]![0]) return points[0]![1]
  const last = points[points.length - 1]!
  if (t >= last[0]) return last[1]
  const bi = bisector((d: [number, number]) => d[0]).left
  const i = Math.min(points.length - 1, Math.max(1, bi(points, t)))
  const p0 = points[i - 1]!
  const p1 = points[i]!
  if (p1[0] === p0[0]) return p1[1]
  const frac = (t - p0[0]) / (p1[0] - p0[0])
  return p0[1] + frac * (p1[1] - p0[1])
}

/**
 * Same idea as interpolateAt, but holds at the *previous* point's value instead of blending
 * towards the next one - matches curveStepAfter, which is how po2Calculated is actually drawn
 * (see po2CalculatedLine in DiveGraph.vue): the value only changes at the instant a new sample
 * logs, so interpolating it linearly would show the tooltip/hover ramping smoothly between two
 * readings while the drawn line visibly snaps. Used wherever a metric's line uses that curve, so
 * the two stay in agreement.
 */
export function stepAfterValueAt(points: [number, number][] | undefined, t: number): number | undefined {
  if (!points || points.length === 0) return undefined
  if (t <= points[0]![0]) return points[0]![1]
  const last = points[points.length - 1]!
  if (t >= last[0]) return last[1]
  const bi = bisector((d: [number, number]) => d[0]).right
  const i = Math.min(points.length - 1, Math.max(1, bi(points, t)))
  return points[i - 1]![1]
}

/**
 * Dispatches to the interpolation strategy matching how `metric` is actually drawn - keeps the
 * tooltip value and the hover hit test's Y position in agreement with the visible line for
 * metrics that don't use the default linear curve (currently just po2Calculated).
 */
export function valueAtForMetric(
  points: [number, number][] | undefined,
  t: number,
  metric: Exclude<MetricType, 'depth'>,
): number | undefined {
  return metric === 'po2Calculated' ? stepAfterValueAt(points, t) : interpolateAt(points, t)
}
