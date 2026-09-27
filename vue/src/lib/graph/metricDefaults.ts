import type { ProfileMetricVisibility } from '@/lib/types/graph'
import type {
  ProfileMetricAvailability,
  ProfileMetricCounts,
} from '@/composables/useDiveGraphMetrics'

/** Every metric whose default on/off state is worth deriving from this dive's actual data - excludes
 * `depth` (always on, not user-toggleable), the gas-fraction family (O2/N2/He), which always
 * defaults off regardless of data (see DiveGraphContainer.vue's own handling of those three), and
 * the PO2 family (measured/calculated/setpoint), which gets its own single-best-source selection
 * via {@link selectBestPo2Source} instead of this generic per-metric logic - see its doc comment
 * for why. */
export const DATA_DRIVEN_METRICS = ['temp', 'ndl', 'tts', 'gf', 'cns', 'otu', 'rmv', 'deco'] as const

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

/** Every per-profile metric toggle a diver's choice is remembered for (depth is always on). */
export const REMEMBERED_METRICS = [
  ...DATA_DRIVEN_METRICS,
  'po2Measured',
  'po2Calculated',
  'po2Setpoint',
  'gasO2',
  'gasN2',
  'gasHe',
] as const

export type RememberedMetric = (typeof REMEMBERED_METRICS)[number]

/** The diver's own last on/off choice per metric - for the primary profile, and for secondary
 * (backup / second-computer) profiles. An absent metric was never touched: its default applies. */
export type MetricPreferences = {
  primary: Partial<Record<RememberedMetric, boolean>>
  secondary: Partial<Record<RememberedMetric, boolean>>
}

export type AppliedMetricSelection = {
  show: Record<RememberedMetric, boolean>
  extraProfileMetrics: ProfileMetricVisibility
}

const PO2_METRICS: ReadonlySet<RememberedMetric> = new Set(['po2Measured', 'po2Calculated'])

type SecondaryMetric = keyof ProfileMetricVisibility[number]

/**
 * Applies the diver's remembered choices on top of the data-driven defaults, only where they make
 * sense for this dive: a metric comes back on only on a profile that has data for it, and a PO2
 * line only on the dive's selected best PO2 source (see {@link selectBestPo2Source}).
 *
 * @param hasData per profile (index 0 = primary), whether it has data for a metric
 */
export function applyMetricPreferences(
  defaults: SensibleMetricDefaults,
  prefs: MetricPreferences,
  hasData: ((metric: RememberedMetric) => boolean)[],
): AppliedMetricSelection {
  const po2 = defaults.po2Selection
  const applicable = (idx: number, metric: RememberedMetric) =>
    (hasData[idx]?.(metric) ?? false) &&
    (!PO2_METRICS.has(metric) || (po2?.profileIdx === idx && po2.metric === metric))

  const show = {} as Record<RememberedMetric, boolean>
  for (const metric of REMEMBERED_METRICS) {
    const fallback = (DATA_DRIVEN_METRICS as readonly string[]).includes(metric)
      ? defaults.show[metric as DataDrivenMetric]
      : PO2_METRICS.has(metric)
        ? po2?.profileIdx === 0 && po2.metric === metric
        : false // setpoint + gas fractions default off
    const wanted = prefs.primary[metric]
    show[metric] = wanted === undefined ? fallback : wanted && applicable(0, metric)
  }

  const extraProfileMetrics: ProfileMetricVisibility = {}
  for (let idx = 1; idx < hasData.length; idx++) {
    const own: ProfileMetricVisibility[number] = {}
    for (const metric of REMEMBERED_METRICS) {
      // The deco zone is drawn for the primary profile only.
      if (metric === 'deco') continue
      const key: SecondaryMetric = metric
      const wanted = prefs.secondary[metric]
      const on =
        wanted === undefined
          ? (defaults.extraProfileMetrics[idx]?.[key] ?? false)
          : wanted && applicable(idx, metric)
      if (on) own[key] = true
    }
    if (Object.keys(own).length) extraProfileMetrics[idx] = own
  }
  return { show, extraProfileMetrics }
}

const AVAILABILITY_FLAG: Record<RememberedMetric, keyof ProfileMetricAvailability> = {
  temp: 'hasTemp',
  ndl: 'hasNdl',
  tts: 'hasTts',
  gf: 'hasGf',
  cns: 'hasCns',
  otu: 'hasOtu',
  rmv: 'hasRmv',
  deco: 'hasDeco',
  po2Measured: 'hasPo2Measured',
  po2Calculated: 'hasPo2Calculated',
  po2Setpoint: 'hasPo2Setpoint',
  gasO2: 'hasGasO2',
  gasN2: 'hasGasN2',
  gasHe: 'hasGasHe',
}

/** Whether a profile's availability says it has (drawable) data for `metric`. */
export const metricAvailable = (
  availability: ProfileMetricAvailability,
  metric: RememberedMetric,
): boolean => availability[AVAILABILITY_FLAG[metric]]
