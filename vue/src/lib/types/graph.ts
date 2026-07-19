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

export const DEFAULT_METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  depth: { show: true, color: '#9CA3AF' },
  temp: { show: true, color: '#ef4444' },
  cns: { show: false, color: '#fbbf24' },
  ndl: { show: false, color: '#7c3aed' },
  gf: { show: false, color: '#8b5cf6' },
  otu: { show: false, color: '#ec4899' },
  po2Measured: { show: false, color: '#1d4ed8' },
  po2Calculated: { show: false, color: '#d946ef' },
  po2Setpoint: { show: false, color: '#22c55e' },
  rmv: { show: false, color: '#14b8a6' },
  gasO2: { show: false, color: '#06b6d4' },
  gasN2: { show: false, color: '#84cc16' },
  gasHe: { show: false, color: '#f97316' },
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
