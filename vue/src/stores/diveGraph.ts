import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const GRAPH_CONFIG_KEY = 'diveGraphConfig'
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const useDiveGraphStore = defineStore('diveGraph', () => {
  const configLoaded = ref(false)

  const showTemp = ref(true)
  const showSegments = ref(false)
  const showGrid = ref(true)
  const showNdl = ref(false)
  const showOtu = ref(false)
  const showCns = ref(false)
  const showGf = ref(false)
  const showPo2Measured = ref(false)
  const showPo2Calculated = ref(false)
  const showPo2Setpoint = ref(false)
  const showRmv = ref(false)
  const showGasO2 = ref(false)
  const showGasN2 = ref(false)
  const showGasHe = ref(false)

  const load = () => {
    if (configLoaded.value) return
    if (typeof window === 'undefined') {
      configLoaded.value = true
      return
    }
    try {
      const raw = window.localStorage.getItem(GRAPH_CONFIG_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        showTemp?: boolean
        showSegments?: boolean
        showGrid?: boolean
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
        timestamp?: number
      }

      if (parsed.timestamp && Date.now() - parsed.timestamp > ONE_WEEK_MS) {
        window.localStorage.removeItem(GRAPH_CONFIG_KEY)
        return
      }

      if (typeof parsed.showTemp === 'boolean') showTemp.value = parsed.showTemp
      if (typeof parsed.showSegments === 'boolean') showSegments.value = parsed.showSegments
      if (typeof parsed.showGrid === 'boolean') showGrid.value = parsed.showGrid
      if (typeof parsed.showNdl === 'boolean') showNdl.value = parsed.showNdl
      if (typeof parsed.showOtu === 'boolean') showOtu.value = parsed.showOtu
      if (typeof parsed.showCns === 'boolean') showCns.value = parsed.showCns
      if (typeof parsed.showGf === 'boolean') showGf.value = parsed.showGf
      if (typeof parsed.showPo2Measured === 'boolean') showPo2Measured.value = parsed.showPo2Measured
      if (typeof parsed.showPo2Calculated === 'boolean') showPo2Calculated.value = parsed.showPo2Calculated
      if (typeof parsed.showPo2Setpoint === 'boolean') showPo2Setpoint.value = parsed.showPo2Setpoint
      if (typeof parsed.showRmv === 'boolean') showRmv.value = parsed.showRmv
      if (typeof parsed.showGasO2 === 'boolean') showGasO2.value = parsed.showGasO2
      if (typeof parsed.showGasN2 === 'boolean') showGasN2.value = parsed.showGasN2
      if (typeof parsed.showGasHe === 'boolean') showGasHe.value = parsed.showGasHe
    } catch {
      /* ignore malformed */
    } finally {
      configLoaded.value = true
    }
  }

  const persist = () => {
    if (!configLoaded.value || typeof window === 'undefined') return
    const payload = {
      showTemp: showTemp.value,
      showSegments: showSegments.value,
      showGrid: showGrid.value,
      showNdl: showNdl.value,
      showOtu: showOtu.value,
      showCns: showCns.value,
      showGf: showGf.value,
      showPo2Measured: showPo2Measured.value,
      showPo2Calculated: showPo2Calculated.value,
      showPo2Setpoint: showPo2Setpoint.value,
      showRmv: showRmv.value,
      showGasO2: showGasO2.value,
      showGasN2: showGasN2.value,
      showGasHe: showGasHe.value,
      timestamp: Date.now(),
    }
    window.localStorage.setItem(GRAPH_CONFIG_KEY, JSON.stringify(payload))
  }

  load()

  watch(
    [
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
    ],
    persist,
    { deep: true },
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
  }
})
