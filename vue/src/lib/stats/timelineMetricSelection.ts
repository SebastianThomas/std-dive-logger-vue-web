import { timelineMetricUnits, type TimelineMetric } from '@/lib/types/statsTimeline'

/**
 * Pure selection-toggle logic for the Stats Timeline "Metrics" checkboxes, extracted out of
 * StatsTimelineView.vue so it can be unit tested independent of mounting the whole view.
 *
 * Plain click selects only `metric` (and clears a lone existing selection of the same metric);
 * combining (shift+click, or the "Combine" toggle) adds/removes it instead, but only when its
 * unit is compatible with what's already selected - every currently-selected metric is meant to
 * share one y-axis scale (see StatsTimelineChart.vue), so mixing units on it would either be
 * meaningless or render one line as a flat line dwarfed by the other's range.
 *
 * Compatibility is checked against *every* currently-selected metric's unit, not just one
 * arbitrarily-picked "anchor" - comparing only against the first-inserted metric meant that once
 * the selection contained more than one unit (e.g. the default diveCount + maxDepth combo, which
 * mixes a unit-less count with a metre-based metric), any further combine attempt whose unit
 * didn't match that one specific first metric appeared to silently do nothing instead of adding
 * the new metric alongside the others it *did* share a unit with.
 */
export function toggleMetricSelection(
  current: Set<TimelineMetric>,
  metric: TimelineMetric,
  wantsCombine: boolean,
): Set<TimelineMetric> {
  const next = new Set(current)

  if (!wantsCombine) {
    if (next.size === 1 && next.has(metric)) {
      next.clear()
    } else {
      next.clear()
      next.add(metric)
    }
    return next
  }

  const existingUnits = new Set([...next].map((m) => timelineMetricUnits[m]))
  const compatible = next.size === 0 || existingUnits.has(timelineMetricUnits[metric])
  if (compatible) {
    if (next.has(metric)) {
      next.delete(metric)
    } else {
      next.add(metric)
    }
  } else {
    next.clear()
    next.add(metric)
  }
  return next
}
