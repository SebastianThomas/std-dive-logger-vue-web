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
