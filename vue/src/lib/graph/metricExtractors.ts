import type { DiveMeasurementWithId } from '@/lib/types/dive'
import type { MetricType } from '@/lib/types/graph'
import { parseISODurationToMinutes } from '@/lib/utils/timeUtils'
import type { Line } from 'd3'
import type { Ref } from 'vue'

/**
 * Configuration for a single metric including its data extractor,
 * line generator reference, visibility prop, and stroke width.
 */
export type MetricConfig = {
  extractor: (m: DiveMeasurementWithId) => [number, number] | null
  lineRef: Ref<Line<[number, number]> | null>
  showProp: boolean
  width?: number
}

/**
 * Type for the complete metric configuration object.
 */
export type MetricConfigMap = Record<Exclude<MetricType, 'depth'>, MetricConfig>

/**
 * Creates the metric configuration map for extracting data points from dive measurements.
 * This factory function should be called within the component to access reactive references.
 *
 * @param props - Component props containing visibility flags for each metric
 * @param lineRefs - Object containing reactive references to D3 line generators
 * @returns Complete metric configuration map
 */
export function createMetricConfigs(
  props: {
    showTemp?: boolean
    showNdl?: boolean
    showOtu?: boolean
    showCns?: boolean
    showGf?: boolean
    showPo2Measured?: boolean
    showPo2Calculated?: boolean
    showPo2Setpoint?: boolean
    showRmv?: boolean
    showGasO2?: boolean
    showGasN2?: boolean
    showGasHe?: boolean
  },
  lineRefs: {
    temp: Ref<Line<[number, number]> | null>
    ndl: Ref<Line<[number, number]> | null>
    otu: Ref<Line<[number, number]> | null>
    cns: Ref<Line<[number, number]> | null>
    gf: Ref<Line<[number, number]> | null>
    po2Measured: Ref<Line<[number, number]> | null>
    po2Calculated: Ref<Line<[number, number]> | null>
    po2Setpoint: Ref<Line<[number, number]> | null>
    rmv: Ref<Line<[number, number]> | null>
    gasO2: Ref<Line<[number, number]> | null>
    gasN2: Ref<Line<[number, number]> | null>
    gasHe: Ref<Line<[number, number]> | null>
  },
): MetricConfigMap {
  return {
    temp: {
      extractor: (m) =>
        m.measurement.temperature?.value !== undefined
          ? [m.measurement.time, m.measurement.temperature.value]
          : null,
      lineRef: lineRefs.temp,
      showProp: props.showTemp ?? false,
    },
    ndl: {
      extractor: (m) =>
        m.measurement.ndl
          ? [m.measurement.time, parseISODurationToMinutes(m.measurement.ndl)]
          : null,
      lineRef: lineRefs.ndl,
      showProp: props.showNdl ?? false,
      width: 1.2,
    },
    otu: {
      extractor: (m) =>
        m.measurement.o2Tox !== undefined ? [m.measurement.time, m.measurement.o2Tox] : null,
      lineRef: lineRefs.otu,
      showProp: props.showOtu ?? false,
      width: 1.2,
    },
    cns: {
      extractor: (m) =>
        m.measurement.cns !== undefined ? [m.measurement.time, m.measurement.cns] : null,
      lineRef: lineRefs.cns,
      showProp: props.showCns ?? false,
      width: 1.2,
    },
    gf: {
      extractor: (m) =>
        m.measurement.n2 !== undefined ? [m.measurement.time, m.measurement.n2] : null,
      lineRef: lineRefs.gf,
      showProp: props.showGf ?? false,
      width: 1.2,
    },
    po2Measured: {
      extractor: (m) =>
        m.measurement.po2?.measured !== undefined
          ? [m.measurement.time, m.measurement.po2.measured]
          : null,
      lineRef: lineRefs.po2Measured,
      showProp: props.showPo2Measured ?? false,
      width: 1.2,
    },
    po2Calculated: {
      extractor: (m) =>
        m.measurement.po2?.calculated !== undefined
          ? [m.measurement.time, m.measurement.po2.calculated]
          : null,
      lineRef: lineRefs.po2Calculated,
      showProp: props.showPo2Calculated ?? false,
      width: 1.2,
    },
    po2Setpoint: {
      extractor: (m) =>
        m.measurement.po2?.maxSetPoint !== undefined
          ? [m.measurement.time, m.measurement.po2.maxSetPoint]
          : null,
      lineRef: lineRefs.po2Setpoint,
      showProp: props.showPo2Setpoint ?? false,
      width: 1.2,
    },
    rmv: {
      extractor: (m) =>
        m.measurement.rmvLiters !== undefined
          ? [m.measurement.time, m.measurement.rmvLiters]
          : null,
      lineRef: lineRefs.rmv,
      showProp: props.showRmv ?? false,
      width: 1.2,
    },
    gasO2: {
      extractor: (m) =>
        m.measurement.gas?.o2 !== undefined
          ? [m.measurement.time, m.measurement.gas.o2 * 100]
          : null,
      lineRef: lineRefs.gasO2,
      showProp: props.showGasO2 ?? false,
      width: 1.2,
    },
    gasN2: {
      extractor: (m) =>
        m.measurement.gas?.n2 !== undefined
          ? [m.measurement.time, m.measurement.gas.n2 * 100]
          : null,
      lineRef: lineRefs.gasN2,
      showProp: props.showGasN2 ?? false,
      width: 1.2,
    },
    gasHe: {
      extractor: (m) =>
        m.measurement.gas?.he !== undefined
          ? [m.measurement.time, m.measurement.gas.he * 100]
          : null,
      lineRef: lineRefs.gasHe,
      showProp: props.showGasHe ?? false,
      width: 1.2,
    },
  }
}

/**
 * List of all metrics that should be rendered (excluding depth which is rendered separately).
 */
export const METRICS_TO_RENDER: Array<Exclude<MetricType, 'depth'>> = [
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
