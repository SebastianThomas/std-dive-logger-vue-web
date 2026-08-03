export type MetricType =
  | 'depth'
  | 'temp'
  | 'ndl'
  | 'otu'
  | 'cns'
  | 'gf'
  | 'po2Measured'
  | 'po2Calculated'
  | 'po2Setpoint'
  | 'rmv'
  | 'gasO2'
  | 'gasN2'
  | 'gasHe'

// Alias for axis metrics (same as MetricType)
export type AxisMetric = MetricType

// Per-profile overrides for metrics other than depth (depth is always shown for every visible
// profile - it can only be hidden by hiding the whole profile). Keyed by profile array index.
// Profile 0 (the primary/first profile) isn't represented here - its visibility continues to come
// from the global show*/DEFAULT_METRIC_CONFIGS-backed store, matching pre-existing behavior. This
// map only carries the *additional* metrics a user opts a secondary/backup profile into; an
// absent entry (or an absent key within one) means "off", so a dive with only one profile - the
// overwhelming majority - never touches this at all.
export type ProfileMetricVisibility = Record<number, Partial<Record<Exclude<MetricType, 'depth'>, boolean>>>


export type MetricConfig = {
  show: boolean
  color: string
}

export type DataPoint = {
  time: number
  depth: number
  temperature: number
  temperatureUnit: 'CELSIUS' | 'KELVIN'
  cns?: number
  ndl?: string
  n2Loading?: number
  o2Tox?: number
  rmvLiters?: number
  gasO2?: number
  gasN2?: number
  gasHe?: number
  profileId: number
}

export type TooltipData = {
  x: number
  y: number
  time: number
  depth: number
  temperature: number
  temperatureUnit: 'CELSIUS' | 'KELVIN'
  cns?: number
  ndl?: string
  n2Loading?: number
  o2Tox?: number
  rmvLiters?: number
  gasO2?: number
  gasN2?: number
  gasHe?: number
  startTime: number
  segmentType?: string
} | null

// Colors are grouped by what the metric actually relates to, rather than picked independently,
// so a glance at the color already hints at the family before reading the label:
//  - PO2 measured/calculated/setpoint: three shades of the same cyan-teal, since they're the same
//    physical quantity read three different ways and belong on one shared axis anyway.
//  - Deco ceiling (the red zone drawn in DiveGraph.vue) / gas N2 / NDL / GF99: a red-violet family,
//    ordered by how much attention each deserves - N2 (least) is the palest, NDL a plain violet,
//    GF99 (more important than NDL - it's the actual ceiling-driving number) leans redder/more
//    saturated, and the deco zone itself is full red as the most safety-relevant of the group.
//  - CNS / OTU / gas O2: all oxygen-toxicity-adjacent, so all yellow-orange, distinguished by shade.
//  - Temperature: blue, clearly outside every other family above.
export const DEFAULT_METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  depth: { show: true, color: '#9CA3AF' },
  temp: { show: true, color: '#3b82f6' },
  cns: { show: false, color: '#fbbf24' },
  ndl: { show: false, color: '#7c3aed' },
  // More saturated/red than ndl's violet - GF99 is the number that actually drives the ceiling,
  // so it reads as more important than NDL while staying in the same red-violet family.
  gf: { show: false, color: '#e11d48' },
  // A deeper orange than #f97316 - that shade is already used for the OC/BO bailout marker in
  // DiveGraph.vue (renderModeTransitions), so a dive with both bailout markers and an OTU line
  // visible at once still tells them apart.
  otu: { show: false, color: '#ea580c' },
  po2Measured: { show: false, color: '#0891b2' },
  po2Calculated: { show: false, color: '#22d3ee' },
  po2Setpoint: { show: false, color: '#0e7490' },
  rmv: { show: false, color: '#22c55e' },
  gasO2: { show: false, color: '#ca8a04' },
  // Palest of the red-violet family - explicitly the least important member (see comment above).
  gasN2: { show: false, color: '#c4b5fd' },
  gasHe: { show: false, color: '#64748b' },
}

export const metricUnits: Record<MetricType, string | null> = {
  depth: 'm',
  temp: '°C',
  cns: '%',
  ndl: 'min',
  gf: '%',
  otu: null,
  po2Measured: 'bar',
  po2Calculated: 'bar',
  po2Setpoint: 'bar',
  rmv: 'l/min',
  gasO2: '%',
  gasN2: '%',
  gasHe: '%',
}

export const metricDisplayNames: Record<MetricType, string> = {
  depth: 'Depth',
  temp: 'Temperature',
  cns: 'CNS',
  ndl: 'NDL',
  gf: 'GF99',
  otu: 'OTUs',
  po2Measured: 'PO2 measured',
  po2Calculated: 'PO2 calculated',
  po2Setpoint: 'PO2 setpoint',
  rmv: 'RMV',
  gasO2: 'Gas O2',
  gasN2: 'Gas N2',
  gasHe: 'Gas He',
}

// Y-axis selection is grouped by unit rather than by individual metric: metrics that share a
// unit (e.g. the three PO2 variants, or the three gas fractions) share one axis and one scale,
// so picking any one of them as an axis doesn't silently disagree with the others. CNS and OTU
// are grouped together as "O2 exposure" even though OTU has no natural %, because both track
// oxygen-toxicity accumulation over the dive and can legitimately exceed 100 on an aggressive
// profile — they read naturally on a shared, uncapped scale. Gas fractions, by contrast, are
// physically bounded to [0, 100] and are pinned there rather than auto-scaling to data, so a
// single bad sample can't distort the whole axis.
export type AxisUnitGroup =
  | 'depth'
  | 'temp'
  | 'ndl'
  | 'gf'
  | 'o2Exposure'
  | 'po2'
  | 'gasFraction'
  | 'rmv'

export type AxisUnitGroupConfig = {
  label: string
  metrics: MetricType[]
}

export const AXIS_UNIT_GROUPS: Record<AxisUnitGroup, AxisUnitGroupConfig> = {
  depth: { label: 'Depth (m)', metrics: ['depth'] },
  temp: { label: 'Temperature (°C)', metrics: ['temp'] },
  ndl: { label: 'NDL (min)', metrics: ['ndl'] },
  gf: { label: 'GF99 (%)', metrics: ['gf'] },
  o2Exposure: { label: 'O2 Exposure (CNS / OTU)', metrics: ['cns', 'otu'] },
  po2: { label: 'PO2 (bar)', metrics: ['po2Measured', 'po2Calculated', 'po2Setpoint'] },
  gasFraction: { label: 'Gas Fraction (%)', metrics: ['gasO2', 'gasN2', 'gasHe'] },
  rmv: { label: 'RMV (l/min)', metrics: ['rmv'] },
}

const METRIC_TO_AXIS_GROUP: Record<MetricType, AxisUnitGroup> = Object.fromEntries(
  Object.entries(AXIS_UNIT_GROUPS).flatMap(([group, config]) =>
    config.metrics.map((metric) => [metric, group as AxisUnitGroup]),
  ),
) as Record<MetricType, AxisUnitGroup>

export function axisGroupForMetric(metric: MetricType): AxisUnitGroup {
  return METRIC_TO_AXIS_GROUP[metric]
}
