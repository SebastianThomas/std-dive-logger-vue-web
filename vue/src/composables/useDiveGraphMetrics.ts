import type { DiveProfile } from '@/lib/types/dive'
import { useDiveGraphStore } from '@/stores/diveGraph'
import { storeToRefs } from 'pinia'
import { computed, type Ref } from 'vue'

export type ProfileMetricAvailability = {
  hasTemp: boolean
  hasNdl: boolean
  hasOtu: boolean
  hasCns: boolean
  hasGf: boolean
  hasPo2Measured: boolean
  hasPo2Calculated: boolean
  hasPo2Setpoint: boolean
  hasRmv: boolean
  hasGasO2: boolean
  hasGasN2: boolean
  hasGasHe: boolean
}

export const useDiveGraphMetrics = (profiles: Ref<DiveProfile[]>) => {
  const graphStore = useDiveGraphStore()
  const {
    showTemp,
    showSegments,
    showGrid,
    showNdl,
    showOtu,
    showCns,
    showGf,
    showPo2Measured,
    showPo2Calculated,
    showPo2Setpoint,
    showRmv,
    showGasO2,
    showGasN2,
    showGasHe,
  } = storeToRefs(graphStore)

  const measurements = computed(() => profiles.value.flatMap((p) => p.measurements))

  // Per-profile availability check
  const getProfileMetricAvailability = (profileIdx: number): ProfileMetricAvailability => {
    const profile = profiles.value[profileIdx]
    if (!profile) {
      return {
        hasTemp: false,
        hasNdl: false,
        hasOtu: false,
        hasCns: false,
        hasGf: false,
        hasPo2Measured: false,
        hasPo2Calculated: false,
        hasPo2Setpoint: false,
        hasRmv: false,
        hasGasO2: false,
        hasGasN2: false,
        hasGasHe: false,
      }
    }

    const measurements = profile.measurements
    return {
      hasTemp: measurements.some((m) => m.measurement.temperature?.value !== undefined),
      hasNdl: measurements.some((m) => !!m.measurement.ndl),
      hasOtu: measurements.some((m) => m.measurement.o2Tox !== undefined),
      hasCns: measurements.some((m) => m.measurement.cns !== undefined),
      hasGf: measurements.some((m) => m.measurement.n2 !== undefined),
      hasPo2Measured: measurements.filter((m) => m.measurement.po2?.measured).length > 1,
      hasPo2Calculated: measurements.filter((m) => m.measurement.po2?.calculated).length > 1,
      hasPo2Setpoint: measurements.filter((m) => m.measurement.po2?.maxSetPoint).length > 1,
      hasRmv: measurements.some((m) => m.measurement.rmvLiters !== undefined),
      hasGasO2: measurements.some((m) => m.measurement.gas?.o2 !== undefined),
      hasGasN2: measurements.some((m) => m.measurement.gas?.n2 !== undefined && m.measurement.gas.n2 > 0),
      hasGasHe: measurements.some((m) => m.measurement.gas?.he !== undefined && m.measurement.gas.he > 0),
    }
  }

  // Combined availability for multiple profiles
  const getCombinedMetricAvailability = (profileIndices: number[]): ProfileMetricAvailability => {
    const availabilities = profileIndices.map((idx) => getProfileMetricAvailability(idx))

    return {
      hasTemp: availabilities.some((a) => a.hasTemp),
      hasNdl: availabilities.some((a) => a.hasNdl),
      hasOtu: availabilities.some((a) => a.hasOtu),
      hasCns: availabilities.some((a) => a.hasCns),
      hasGf: availabilities.some((a) => a.hasGf),
      hasPo2Measured: availabilities.some((a) => a.hasPo2Measured),
      hasPo2Calculated: availabilities.some((a) => a.hasPo2Calculated),
      hasPo2Setpoint: availabilities.some((a) => a.hasPo2Setpoint),
      hasRmv: availabilities.some((a) => a.hasRmv),
      hasGasO2: availabilities.some((a) => a.hasGasO2),
      hasGasN2: availabilities.some((a) => a.hasGasN2),
      hasGasHe: availabilities.some((a) => a.hasGasHe),
    }
  }

  const hasTemp = computed(() =>
    measurements.value.some((m) => m.measurement.temperature?.value !== undefined),
  )
  const hasNdl = computed(() => measurements.value.some((m) => !!m.measurement.ndl))
  const hasOtu = computed(() => measurements.value.some((m) => m.measurement.o2Tox !== undefined))
  const hasCns = computed(() => measurements.value.some((m) => m.measurement.cns !== undefined))
  const hasGf = computed(() => measurements.value.some((m) => m.measurement.n2 !== undefined))
  const hasPo2Measured = computed(() =>
    profiles.value.some(
      (p) => p.measurements.filter((m) => m.measurement.po2?.measured !== undefined).length > 1,
    ),
  )
  const hasPo2Calculated = computed(() =>
    profiles.value.some(
      (p) => p.measurements.filter((m) => m.measurement.po2?.calculated !== undefined).length > 1,
    ),
  )
  const hasPo2Setpoint = computed(() =>
    profiles.value.some(
      (p) => p.measurements.filter((m) => m.measurement.po2?.maxSetPoint !== undefined).length > 1,
    ),
  )
  const hasRmv = computed(() =>
    measurements.value.some((m) => m.measurement.rmvLiters !== undefined),
  )
  const hasGasO2 = computed(() =>
    measurements.value.some((m) => m.measurement.gas?.o2 !== undefined),
  )
  const hasGasN2 = computed(() =>
    measurements.value.some((m) => m.measurement.gas?.n2 !== undefined && m.measurement.gas.n2 > 0),
  )
  const hasGasHe = computed(() =>
    measurements.value.some((m) => m.measurement.gas?.he !== undefined && m.measurement.gas.he > 0),
  )

  return {
    showTemp,
    showSegments,
    showGrid,
    showNdl,
    showOtu,
    showCns,
    showGf,
    showPo2Measured,
    showPo2Calculated,
    showPo2Setpoint,
    showRmv,
    showGasO2,
    showGasN2,
    showGasHe,
    hasTemp,
    hasNdl,
    hasOtu,
    hasCns,
    hasGf,
    hasPo2Measured,
    hasPo2Calculated,
    hasPo2Setpoint,
    hasRmv,
    hasGasO2,
    hasGasN2,
    hasGasHe,
    getProfileMetricAvailability,
    getCombinedMetricAvailability,
  }
}
