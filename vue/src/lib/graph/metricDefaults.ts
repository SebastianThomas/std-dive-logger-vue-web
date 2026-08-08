import type { ProfileMetricVisibility } from '@/lib/types/graph'
import type { ProfileMetricCounts } from '@/composables/useDiveGraphMetrics'

/** Every metric whose default on/off state is worth deriving from this dive's actual data - excludes
 * `depth` (always on, not user-toggleable) and the gas-fraction family (O2/N2/He), which always
 * default off regardless of data - see DiveGraphContainer.vue's own handling of those three. */
export const DATA_DRIVEN_METRICS = [
  'temp',
  'ndl',
  'gf',
  'cns',
  'otu',
  'po2Measured',
  'po2Calculated',
  'po2Setpoint',
  'rmv',
] as const

export type DataDrivenMetric = (typeof DATA_DRIVEN_METRICS)[number]

export type SensibleMetricDefaults = {
  /** Whether the primary row's toggle for this metric should default on. */
  show: Record<DataDrivenMetric, boolean>
  /** Which secondary profile(s) should have this metric opted in by default, because they have
   * more data for it than the primary profile does. */
  extraProfileMetrics: ProfileMetricVisibility
}

/**
 * Picks a sensible default per metric from actual per-profile data, given one {@link
 * ProfileMetricCounts} per profile in profile-index order (index 0 = primary).
 *
 * The primary row only defaults a metric on if the *primary* profile itself has data for it - not
 * "some profile somewhere has a couple of points", which previously let e.g. PO2 appear enabled by
 * default even on dives where the profile actually being drawn had nothing to show for it.
 *
 * Whenever a different profile has strictly more data for the same metric than the primary does,
 * that profile is opted into it via the returned `extraProfileMetrics`, so the richer data source
 * is what's actually visible by default - e.g. a backup CCR handset with a full PO2 log next to a
 * primary computer that only logged a handful of stray readings.
 */
export function computeSensibleMetricDefaults(
  profileCounts: ProfileMetricCounts[],
): SensibleMetricDefaults {
  const show = {} as Record<DataDrivenMetric, boolean>
  const extraProfileMetrics: ProfileMetricVisibility = {}

  for (const metric of DATA_DRIVEN_METRICS) {
    const counts = profileCounts.map((c) => c[metric])
    const primaryCount = counts[0] ?? 0
    let bestIdx = 0
    let bestCount = primaryCount
    counts.forEach((count, idx) => {
      if (count > bestCount) {
        bestIdx = idx
        bestCount = count
      }
    })

    show[metric] = primaryCount > 0

    if (bestIdx !== 0 && bestCount > primaryCount) {
      extraProfileMetrics[bestIdx] = { ...extraProfileMetrics[bestIdx], [metric]: true }
    }
  }

  return { show, extraProfileMetrics }
}
