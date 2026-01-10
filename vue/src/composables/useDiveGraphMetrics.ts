import type { DiveProfile } from '@/lib/types/dive'
import { useDiveGraphStore } from '@/stores/diveGraph'
import { storeToRefs } from 'pinia'
import { computed, type Ref } from 'vue'

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

  const hasTemp = computed(() =>
    measurements.value.some((m) => m.measurement.temperature?.value !== undefined),
  )
  const hasNdl = computed(() => measurements.value.some((m) => !!m.measurement.ndl))
  const hasOtu = computed(() => measurements.value.some((m) => m.measurement.o2Tox !== undefined))
  const hasCns = computed(() => measurements.value.some((m) => m.measurement.cns !== undefined))
  const hasGf = computed(() => measurements.value.some((m) => m.measurement.n2 !== undefined))
  const hasPo2Measured = computed(() =>
    profiles.value.some((p) =>
      p.measurements.filter((m) => m.measurement.po2?.measured !== undefined).length > 1,
    ),
  )
  const hasPo2Calculated = computed(() =>
    profiles.value.some((p) =>
      p.measurements.filter((m) => m.measurement.po2?.calculated !== undefined).length > 1,
    ),
  )
  const hasPo2Setpoint = computed(() =>
    profiles.value.some((p) =>
      p.measurements.filter((m) => m.measurement.po2?.maxSetPoint !== undefined).length > 1,
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
  }
}
