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
//  - Gas O2 / PO2 measured/calculated/setpoint / CNS / OTU: all oxygen-related (fraction, partial
//    pressure, and its two toxicity trackers), so all shades of green - lime/pure green for
//    CNS/OTU/O2, blue-green (emerald) for the PO2 trio specifically since those three are also
//    the same physical quantity read three different ways and belong on one shared axis.
//  - Deco ceiling (the red zone drawn in DiveGraph.vue) / NDL / GF99: a red-violet family, GF99
//    more saturated/red than NDL since it's the actual ceiling-driving number, more important.
//  - Gas N2: the least interesting number on a normal dive, so it's near-black - present but
//    deliberately recessive rather than competing for attention.
//  - Gas He: brown, distinct from every other family.
//  - Temperature: blue, clearly outside every other family above.
export const DEFAULT_METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  depth: { show: true, color: '#9CA3AF' },
  temp: { show: true, color: '#3b82f6' },
  cns: { show: false, color: '#84cc16' },
  ndl: { show: false, color: '#7c3aed' },
  // More saturated/red than ndl's violet - GF99 is the number that actually drives the ceiling,
  // so it reads as more important than NDL while staying in the same red-violet family.
  gf: { show: false, color: '#e11d48' },
  otu: { show: false, color: '#22c55e' },
  po2Measured: { show: false, color: '#059669' },
  po2Calculated: { show: false, color: '#34d399' },
  po2Setpoint: { show: false, color: '#065f46' },
  rmv: { show: false, color: '#4f46e5' },
  gasO2: { show: false, color: '#15803d' },
  // Near-black rather than grouped with the other gas fractions - least important number on a
  // normal dive, so it stays visible but recedes rather than drawing the eye.
  gasN2: { show: false, color: '#27272a' },
  gasHe: { show: false, color: '#92400e' },
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
