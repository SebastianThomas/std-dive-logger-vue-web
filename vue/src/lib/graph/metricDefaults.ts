import type { ProfileMetricVisibility } from '@/lib/types/graph'
import type { ProfileMetricCounts } from '@/composables/useDiveGraphMetrics'

/** Every metric whose default on/off state is worth deriving from this dive's actual data - excludes
 * `depth` (always on, not user-toggleable), the gas-fraction family (O2/N2/He), which always
 * defaults off regardless of data (see DiveGraphContainer.vue's own handling of those three), and
 * the PO2 family (measured/calculated/setpoint), which gets its own single-best-source selection
 * via {@link selectBestPo2Source} instead of this generic per-metric logic - see its doc comment
 * for why. */
export const DATA_DRIVEN_METRICS = ['temp', 'ndl', 'gf', 'cns', 'otu', 'rmv', 'deco'] as const

export type DataDrivenMetric = (typeof DATA_DRIVEN_METRICS)[number]

/** Which single profile+metric combination is the dive's one most-accurate PO2 source, if any -
 * `null` when no profile has usable PO2 data at all. */
export type Po2Selection = { profileIdx: number; metric: 'po2Measured' | 'po2Calculated' } | null

/**
 * Picks the dive's single most-accurate PO2 source across every profile, instead of showing every
 * profile/metric that happens to have data at once. Redundant handsets/backup computers in the
 * same CCR loop (or multiple CCRs sharing a dive) each report their own measured PO2 - and a
 * fixed-setpoint device with no PO2 sensor at all still has *a* calculated PO2 (see
 * {@link ../composables/useDiveGraphMetrics.getProfileMetricCounts}'s synthesis fallback) - so
 * left unconstrained, every one of them would default to visible simultaneously.
 *
 * Priority: an actual measured-PO2 reading always outranks a calculated one (real sensor data vs.
 * a derived estimate); among profiles carrying the same tier, the one with the most samples wins.
 */
export function selectBestPo2Source(profileCounts: ProfileMetricCounts[]): Po2Selection {
  const richest = (metric: 'po2Measured' | 'po2Calculated'): { idx: number; count: number } => {
    let idx = -1
    let count = 0
    profileCounts.forEach((c, i) => {
      if (c[metric] > count) {
        idx = i
        count = c[metric]
      }
    })
    return { idx, count }
  }

  const measured = richest('po2Measured')
  if (measured.idx >= 0 && measured.count > 1) {
    return { profileIdx: measured.idx, metric: 'po2Measured' }
  }

  const calculated = richest('po2Calculated')
  if (calculated.idx >= 0 && calculated.count > 1) {
    return { profileIdx: calculated.idx, metric: 'po2Calculated' }
  }

  return null
}

export type SensibleMetricDefaults = {
  /** Whether the primary row's toggle for this metric should default on. */
  show: Record<DataDrivenMetric, boolean>
  /** Which secondary profile(s) should have this metric opted in by default, because they have
   * more data for it than the primary profile does (or, for the PO2 family, because they're the
   * dive's single selected best PO2 source - see {@link selectBestPo2Source}). */
  extraProfileMetrics: ProfileMetricVisibility
  /** The dive's single selected best PO2 source, if any - callers use this to also gate which
   * profile's PO2 checkboxes stay enabled at all (see DiveGraphContainer.vue). */
  po2Selection: Po2Selection
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

  const po2Selection = selectBestPo2Source(profileCounts)
  if (po2Selection && po2Selection.profileIdx !== 0) {
    extraProfileMetrics[po2Selection.profileIdx] = {
      ...extraProfileMetrics[po2Selection.profileIdx],
      [po2Selection.metric]: true,
    }
  }

  return { show, extraProfileMetrics, po2Selection }
}
