import type { MetricType } from '@/lib/types/graph'
import { metricUnits } from '@/lib/types/graph'
import type { ScaleLinear } from 'd3'

/**
 * Configuration for axis tick intervals in seconds.
 * Used to generate smart time axis labels based on graph width and duration.
 */
export const TIME_TICK_INTERVALS = [30, 60, 120, 300, 600, 1200, 1800, 3600] as const

/**
 * Generates optimal tick values for a time axis based on duration and graph width.
 * Returns tick values aligned to clean interval boundaries relative to the start time.
 *
 * @param timeRangeMs - The time range as [startMs, endMs]
 * @param startTimeMs - The reference start time (e.g., dive start)
 * @param graphWidth - The width of the graph in pixels
 * @returns Array of tick values in milliseconds
 */
export function generateTimeAxisTicks(
  timeRangeMs: [number, number],
  startTimeMs: number,
  graphWidth: number,
): number[] {
  const timeDuration = timeRangeMs[1] - timeRangeMs[0]
  const timeDurationSeconds = timeDuration / 1000

  // Target 4-10 labels; bias towards 6-7 labels for best readability
  const targetLabelCount = Math.max(4, Math.min(10, Math.ceil(graphWidth / 100)))

  // Find the best interval that gives us close to targetLabelCount labels
  let bestInterval = 60
  let bestDiff = Math.abs(Math.ceil(timeDurationSeconds / 60) - targetLabelCount)

  for (const interval of TIME_TICK_INTERVALS) {
    const labelCount = Math.ceil(timeDurationSeconds / interval)
    const diff = Math.abs(labelCount - targetLabelCount)

    // Prefer intervals that give us 4-10 labels and are closest to target
    if (labelCount >= 4 && labelCount <= 10 && diff < bestDiff) {
      bestInterval = interval
      bestDiff = diff
    }
  }

  // Generate tick values starting from a clean interval boundary
  const tickValues: number[] = []
  const intervalMs = bestInterval * 1000
  // Align ticks to the dive start time, not to epoch 0
  const offsetFromDiveStart = timeRangeMs[0] - startTimeMs
  let firstTickOffset = Math.floor(offsetFromDiveStart / intervalMs) * intervalMs
  if (firstTickOffset < offsetFromDiveStart) {
    firstTickOffset += intervalMs
  }
  const firstTickTime = startTimeMs + firstTickOffset
  for (let t = firstTickTime; t <= timeRangeMs[1]; t += intervalMs) {
    tickValues.push(t)
  }

  return tickValues
}

/**
 * Formats an axis tick value based on the metric type.
 * Applies appropriate precision and units for each metric.
 *
 * @param metric - The metric type being displayed
 * @param value - The numeric value to format
 * @returns Formatted string for display on the axis
 */
export function formatAxisTick(metric: MetricType, value: number): string {
  const unit = metricUnits[metric]

  switch (metric) {
    case 'depth':
      return `${value} ${unit ?? ''}`
    case 'temp':
      return `${value.toFixed(0)}${unit ?? ''}`
    case 'ndl':
    case 'otu':
      return `${value}`
    case 'cns':
    case 'gf':
    case 'gasO2':
    case 'gasN2':
    case 'gasHe':
      return `${value}${unit ?? ''}`
    case 'po2Measured':
    case 'po2Calculated':
    case 'po2Setpoint':
      return `${value.toFixed(2)} ${unit ?? ''}`
    case 'rmv':
      return `${value.toFixed(1)}`
    default:
      return `${value}`
  }
}

/**
 * Generates tick values for temperature axis with 5-degree intervals.
 * @param domain - The temperature scale domain [min, max]
 * @returns Array of tick values at 5-degree intervals
 */
export function generateTemperatureTicks(domain: [number, number]): number[] {
  const tempTicks: number[] = []
  for (let t = Math.ceil(domain[0] / 5) * 5; t <= domain[1]; t += 5) {
    tempTicks.push(t)
  }
  return tempTicks
}

/**
 * Calculates optimal temperature scale extent with rounding to multiples of 5.
 * Ensures a minimum range of 10 degrees for better visualization.
 *
 * @param temperatureValues - Array of temperature values
 * @returns Temperature extent as [min, max], or [10, 20] if no values
 */
export function calculateTemperatureExtent(temperatureValues: number[]): [number, number] {
  if (temperatureValues.length === 0) {
    return [10, 20]
  }

  const minTemp = Math.min(...temperatureValues)
  const maxTemp = Math.max(...temperatureValues)

  // Round down to nearest multiple of 5
  let tempMin = Math.floor(minTemp / 5) * 5
  // Round up to nearest multiple of 5
  let tempMax = Math.ceil(maxTemp / 5) * 5

  // Ensure minimum range of 10 degrees
  const range = tempMax - tempMin
  if (range < 10) {
    const center = (tempMin + tempMax) / 2
    tempMin = Math.floor((center - 5) / 5) * 5
    tempMax = Math.ceil((center + 5) / 5) * 5
  }

  return [tempMin, tempMax]
}

/**
 * Type guard to check if a value is a valid MetricType.
 */
export function isMetricType(value: string): value is MetricType {
  const validMetrics: readonly string[] = [
    'depth',
    'temp',
    'ndl',
    'otu',
    'cns',
    'gf',
    'po2Measured',
    'po2Calculated',
    'po2Setpoint',
    'rmv',
    'gasO2',
    'gasN2',
    'gasHe',
  ]
  return validMetrics.includes(value)
}

/**
 * Maps a metric type to its corresponding D3 scale.
 * @param metric - The metric type
 * @param scales - Object containing all available scales
 * @returns The scale for the metric, or null if not found
 */
export function getScaleForMetric<T extends ScaleLinear<number, number>>(
  metric: MetricType,
  scales: {
    depth: T | null
    temp: T | null
    ndl: T | null
    otu: T | null
    cns: T | null
    gf: T | null
    po2: T | null
    rmv: T | null
    gas: T | null
  },
): T | null {
  switch (metric) {
    case 'depth':
      return scales.depth
    case 'temp':
      return scales.temp
    case 'ndl':
      return scales.ndl
    case 'otu':
      return scales.otu
    case 'cns':
      return scales.cns
    case 'gf':
      return scales.gf
    case 'po2Measured':
    case 'po2Calculated':
    case 'po2Setpoint':
      return scales.po2
    case 'rmv':
      return scales.rmv
    case 'gasO2':
    case 'gasN2':
    case 'gasHe':
      return scales.gas
    default:
      return null
  }
}
