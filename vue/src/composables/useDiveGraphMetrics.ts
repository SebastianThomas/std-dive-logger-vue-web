import type { DiveProfile } from '@/lib/types/dive'
import { useDiveGraphStore } from '@/stores/diveGraph'
import { storeToRefs } from 'pinia'
import { type Ref } from 'vue'

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
  hasDeco: boolean
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
    showDecoZone,
  } = storeToRefs(graphStore)

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
        hasDeco: false,
      }
    }

    const measurements = profile.measurements

    let hasTemp = false
    let hasNdl = false
    let hasOtu = false
    let hasCns = false
    let hasGf = false
    let hasRmv = false
    let hasGasO2 = false
    let hasGasN2 = false
    let hasGasHe = false
    let hasDeco = false
    // The three >1 checks below (po2 measured/calculated/setpoint) need a count, not just a
    // boolean, so track counts for those and derive the flags once we're done.
    let po2MeasuredCount = 0
    let po2CalculatedCount = 0
    let po2SetpointCount = 0

    for (const m of measurements) {
      if (!hasTemp && m.measurement.temperature?.value !== undefined) hasTemp = true
      if (!hasNdl && !!m.measurement.ndl) hasNdl = true
      if (!hasOtu && m.measurement.o2Tox !== undefined) hasOtu = true
      if (!hasCns && m.measurement.cns !== undefined) hasCns = true
      if (!hasGf && m.measurement.n2 !== undefined) hasGf = true
      // !== undefined, not a truthy check - a genuine 0.00 bar reading (e.g. right at the
      // surface) must still count as real data, not be mistaken for "not logged".
      if (m.measurement.po2?.measured !== undefined) po2MeasuredCount++
      if (m.measurement.po2?.calculated !== undefined) po2CalculatedCount++
      if (m.measurement.po2?.maxSetPoint !== undefined) po2SetpointCount++
      if (!hasRmv && m.measurement.rmvLiters !== undefined) hasRmv = true
      if (!hasGasO2 && m.measurement.gas?.o2 !== undefined) hasGasO2 = true
      if (!hasGasN2 && m.measurement.gas?.n2 !== undefined && m.measurement.gas.n2 > 0)
        hasGasN2 = true
      if (!hasGasHe && m.measurement.gas?.he !== undefined && m.measurement.gas.he > 0)
        hasGasHe = true
      if (!hasDeco && (m.measurement.deco?.length ?? 0) > 0) hasDeco = true

      // Short-circuit once every flag we can be sure of is settled. The po2 counts can only
      // grow, so once they've each passed the ">1" threshold there's nothing left to learn from
      // scanning further either.
      if (
        hasTemp &&
        hasNdl &&
        hasOtu &&
        hasCns &&
        hasGf &&
        hasRmv &&
        hasGasO2 &&
        hasGasN2 &&
        hasGasHe &&
        hasDeco &&
        po2MeasuredCount > 1 &&
        po2CalculatedCount > 1 &&
        po2SetpointCount > 1
      ) {
        break
      }
    }

    return {
      hasTemp,
      hasNdl,
      hasOtu,
      hasCns,
      hasGf,
      hasPo2Measured: po2MeasuredCount > 1,
      hasPo2Calculated: po2CalculatedCount > 1,
      hasPo2Setpoint: po2SetpointCount > 1,
      hasRmv,
      hasGasO2,
      hasGasN2,
      hasGasHe,
      hasDeco,
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
      hasDeco: availabilities.some((a) => a.hasDeco),
    }
  }

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
    showDecoZone,
    getProfileMetricAvailability,
    getCombinedMetricAvailability,
  }
}
