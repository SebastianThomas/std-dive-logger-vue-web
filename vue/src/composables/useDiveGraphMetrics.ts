import type { DiveProfile } from '@/lib/types/dive'
import { useDiveGraphStore } from '@/stores/diveGraph'
import { synthesizePo2Calculated } from '@/lib/graph/po2Synthesis'
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

/** Raw point counts backing {@link ProfileMetricAvailability} - lets a caller compare *how much*
 * data a profile has for a metric, not just whether it has any, e.g. to prefer a backup
 * computer's much more complete PO2 log over the primary's handful of stray readings. */
export type ProfileMetricCounts = {
  temp: number
  ndl: number
  otu: number
  cns: number
  gf: number
  po2Measured: number
  po2Calculated: number
  po2Setpoint: number
  rmv: number
  gasO2: number
  gasN2: number
  gasHe: number
  deco: number
  /** Measurements logged with mode === 'CC' - a setpoint is only a meaningful concept on a
   * closed-circuit profile, so this gates whether po2Setpoint availability actually means
   * anything (see hasPo2Setpoint below). */
  ccSamples: number
}

const EMPTY_COUNTS: ProfileMetricCounts = {
  temp: 0,
  ndl: 0,
  otu: 0,
  cns: 0,
  gf: 0,
  po2Measured: 0,
  po2Calculated: 0,
  po2Setpoint: 0,
  rmv: 0,
  gasO2: 0,
  gasN2: 0,
  gasHe: 0,
  deco: 0,
  ccSamples: 0,
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

  // Per-profile point counts - the single scan every other per-profile helper below derives from.
  const getProfileMetricCounts = (profileIdx: number): ProfileMetricCounts => {
    const profile = profiles.value[profileIdx]
    if (!profile) return { ...EMPTY_COUNTS }

    const counts: ProfileMetricCounts = { ...EMPTY_COUNTS }

    for (const m of profile.measurements) {
      if (m.measurement.temperature?.value !== undefined) counts.temp++
      if (m.measurement.ndl) counts.ndl++
      if (m.measurement.o2Tox !== undefined) counts.otu++
      if (m.measurement.cns !== undefined) counts.cns++
      if (m.measurement.n2 !== undefined) counts.gf++
      // !== undefined, not a truthy check - a genuine 0.00 bar reading (e.g. right at the
      // surface) must still count as real data, not be mistaken for "not logged".
      if (m.measurement.po2?.measured !== undefined) counts.po2Measured++
      if (m.measurement.po2?.calculated !== undefined) counts.po2Calculated++
      if (m.measurement.po2?.maxSetPoint !== undefined) counts.po2Setpoint++
      if (m.measurement.rmvLiters !== undefined) counts.rmv++
      if (m.measurement.gas?.o2 !== undefined) counts.gasO2++
      if (m.measurement.gas?.n2 !== undefined && m.measurement.gas.n2 > 0) counts.gasN2++
      if (m.measurement.gas?.he !== undefined && m.measurement.gas.he > 0) counts.gasHe++
      if ((m.measurement.deco?.length ?? 0) > 0) counts.deco++
      if (m.measurement.mode === 'CC') counts.ccSamples++
    }

    // No real calculated-PO2 samples logged (e.g. a fixed-setpoint CCR handset that only ever
    // reports measured PO2/setpoint) - fall back to a client-side synthesized line (FO2 × ambient
    // pressure) so the dive still has *a* calculated-PO2 source to pick from, same as if the
    // device had logged one itself.
    if (counts.po2Calculated <= 1) {
      const synthesized = synthesizePo2Calculated(profile)
      if (synthesized.length > counts.po2Calculated) counts.po2Calculated = synthesized.length
    }

    return counts
  }

  // Per-profile availability check
  const getProfileMetricAvailability = (profileIdx: number): ProfileMetricAvailability => {
    const c = getProfileMetricCounts(profileIdx)
    return {
      hasTemp: c.temp > 0,
      hasNdl: c.ndl > 0,
      hasOtu: c.otu > 0,
      hasCns: c.cns > 0,
      hasGf: c.gf > 0,
      // PO2 needs more than one real sample to draw a meaningful line - a single stray reading
      // (e.g. a sensor error code that happens to parse as a number) isn't worth a whole toggle.
      hasPo2Measured: c.po2Measured > 1,
      hasPo2Calculated: c.po2Calculated > 1,
      // A setpoint is meaningless outside CC mode - without this, an OC profile with stray/
      // artifact maxSetPoint samples (a device quirk or bad import data) would still show the
      // setpoint toggle as selectable even though there's no such thing as a setpoint on OC.
      hasPo2Setpoint: c.po2Setpoint > 1 && c.ccSamples > 0,
      hasRmv: c.rmv > 0,
      hasGasO2: c.gasO2 > 0,
      hasGasN2: c.gasN2 > 0,
      hasGasHe: c.gasHe > 0,
      hasDeco: c.deco > 0,
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
    getProfileMetricCounts,
  }
}
