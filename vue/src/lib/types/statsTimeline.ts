import type { BaseConfiguration } from './dive'

export type TimelineGranularity = 'PER_DIVE' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'

export const TIMELINE_GRANULARITIES: { value: TimelineGranularity; label: string }[] = [
  { value: 'PER_DIVE', label: 'Per Dive' },
  { value: 'WEEK', label: 'Weekly' },
  { value: 'MONTH', label: 'Monthly' },
  { value: 'QUARTER', label: 'Quarterly' },
  { value: 'YEAR', label: 'Yearly' },
]

export type TimelineMetric =
  | 'diveCount'
  | 'avgRmv'
  | 'maxDepth'
  | 'avgDepth'
  | 'totalDiveTime'
  | 'maxDiveTime'
  | 'avgEndCns'
  | 'avgTemperature'
  | 'avgVisibility'
  | 'avgWeight'

/** Categorical metrics: plotted as one line per category (suit / base configuration) rather than a single series. */
export type TimelineCategoricalMetric = 'suitUsage' | 'baseConfigUsage'

export type TimelineMetricConfig = {
  show: boolean
  color: string
}

export const DEFAULT_TIMELINE_METRIC_CONFIGS: Record<TimelineMetric, TimelineMetricConfig> = {
  diveCount: { show: true, color: '#60a5fa' },
  avgRmv: { show: false, color: '#14b8a6' },
  maxDepth: { show: true, color: '#9CA3AF' },
  avgDepth: { show: false, color: '#6b7280' },
  totalDiveTime: { show: false, color: '#8b5cf6' },
  maxDiveTime: { show: false, color: '#a78bfa' },
  avgEndCns: { show: false, color: '#fbbf24' },
  avgTemperature: { show: false, color: '#ef4444' },
  avgVisibility: { show: false, color: '#22c55e' },
  avgWeight: { show: false, color: '#f97316' },
}

export const DEFAULT_TIMELINE_CATEGORICAL_CONFIGS: Record<
  TimelineCategoricalMetric,
  TimelineMetricConfig
> = {
  suitUsage: { show: false, color: '#06b6d4' },
  baseConfigUsage: { show: false, color: '#d946ef' },
}

export const timelineMetricUnits: Record<TimelineMetric, string | null> = {
  diveCount: null,
  avgRmv: 'l/min',
  maxDepth: 'm',
  avgDepth: 'm',
  totalDiveTime: 'min',
  maxDiveTime: 'min',
  avgEndCns: '%',
  avgTemperature: '°C',
  avgVisibility: 'm',
  avgWeight: 'kg',
}

export const timelineMetricDisplayNames: Record<TimelineMetric, string> = {
  diveCount: 'Dive Count',
  avgRmv: 'Avg RMV',
  maxDepth: 'Max Depth',
  avgDepth: 'Avg Depth',
  totalDiveTime: 'Total Dive Time',
  maxDiveTime: 'Max Dive Time',
  avgEndCns: 'Avg End CNS',
  avgTemperature: 'Avg Temperature',
  avgVisibility: 'Avg Visibility',
  avgWeight: 'Avg Weight',
}

export const timelineCategoricalDisplayNames: Record<TimelineCategoricalMetric, string> = {
  suitUsage: 'Suit Usage',
  baseConfigUsage: 'Base Setup Usage',
}

export type StatsTimeSeriesPoint = {
  bucketStart: number
  /** Only set for PER_DIVE granularity, where each bucket is exactly one dive. */
  diveId?: number
  diveCount: number
  avgRmvLiters?: number
  maxDepth?: number
  avgDepth?: number
  totalDurationSeconds: number
  maxDurationSeconds: number
  avgEndCns?: number
  avgTemperatureCelsius?: number
  avgVisibilityMeters?: number
  avgWeightKg?: number
}

export type StatsCategoryPoint = {
  bucketStart: number
  category: string
  diveCount: number
}

export type StatsTimeSeries = {
  points: StatsTimeSeriesPoint[]
  suitUsage: StatsCategoryPoint[]
  baseConfigurationUsage: StatsCategoryPoint[]
}

export type StatsTimelineFilters = {
  tagIds: number[]
  diveSiteId: number | null
  suitId: number | null
  baseConfiguration: BaseConfiguration | null
  query: string
}

export const EMPTY_TIMELINE_FILTERS: StatsTimelineFilters = {
  tagIds: [],
  diveSiteId: null,
  suitId: null,
  baseConfiguration: null,
  query: '',
}
