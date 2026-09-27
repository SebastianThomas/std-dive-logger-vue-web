import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'
import type { MetricPreferences, RememberedMetric } from '@/lib/graph/metricDefaults'

const GRAPH_CONFIG_KEY = 'diveGraphConfig'
/** The diver's own metric toggles (see MetricPreferences) - kept without expiry. */
const METRIC_PREFS_KEY = 'diveGraphMetricPrefs'

const loadMetricPreferences = (): MetricPreferences => {
  try {
    const parsed = JSON.parse(safeLocalStorage.getItem(METRIC_PREFS_KEY) ?? 'null') as
      | Partial<MetricPreferences>
      | null
    return { primary: { ...parsed?.primary }, secondary: { ...parsed?.secondary } }
  } catch {
    return { primary: {}, secondary: {} }
  }
}

export const useDiveGraphStore = defineStore('diveGraph', () => {
  const configLoaded = ref(false)

  const showTemp = ref(true)
  const showSegments = ref(false)
  const showGrid = ref(true)
  const showNdl = ref(false)
  const showTts = ref(false)
  const showOtu = ref(false)
  const showCns = ref(false)
  const showGf = ref(false)
  const showPo2Measured = ref(false)
  const showPo2Calculated = ref(false)
  const showPo2Setpoint = ref(false)
  const showRmv = ref(false)
  // Gas fraction lines (O2/N2/He) are deliberately excluded from persistence below (both load and
  // persist) - always start off for every dive, in every new session, regardless of what was
  // toggled last time. They're of limited everyday use, and Gas N2's near-black default color in
  // particular is barely visible in dark mode - not something that should silently stay "on" once
  // someone tries it once. Still togglable by hand for the rest of the current session.
  const showGasO2 = ref(false)
  const showGasN2 = ref(false)
  const showGasHe = ref(false)
  const showDecoZone = ref(true)

  const load = () => {
    if (configLoaded.value) return
    try {
      const raw = safeLocalStorage.getItem(GRAPH_CONFIG_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        showTemp?: boolean
        showSegments?: boolean
        showGrid?: boolean
        showNdl?: boolean
        showTts?: boolean
        showOtu?: boolean
        showCns?: boolean
        showGf?: boolean
        showPo2Measured?: boolean
        showPo2Calculated?: boolean
        showPo2Setpoint?: boolean
        showRmv?: boolean
        showDecoZone?: boolean
        timestamp?: number
      }

      if (typeof parsed.showTemp === 'boolean') showTemp.value = parsed.showTemp
      if (typeof parsed.showSegments === 'boolean') showSegments.value = parsed.showSegments
      if (typeof parsed.showGrid === 'boolean') showGrid.value = parsed.showGrid
      if (typeof parsed.showNdl === 'boolean') showNdl.value = parsed.showNdl
      if (typeof parsed.showTts === 'boolean') showTts.value = parsed.showTts
      if (typeof parsed.showOtu === 'boolean') showOtu.value = parsed.showOtu
      if (typeof parsed.showCns === 'boolean') showCns.value = parsed.showCns
      if (typeof parsed.showGf === 'boolean') showGf.value = parsed.showGf
      if (typeof parsed.showPo2Measured === 'boolean')
        showPo2Measured.value = parsed.showPo2Measured
      if (typeof parsed.showPo2Calculated === 'boolean')
        showPo2Calculated.value = parsed.showPo2Calculated
      if (typeof parsed.showPo2Setpoint === 'boolean')
        showPo2Setpoint.value = parsed.showPo2Setpoint
      if (typeof parsed.showRmv === 'boolean') showRmv.value = parsed.showRmv
      // showGasO2/N2/He deliberately not restored here - see their declaration above.
      if (typeof parsed.showDecoZone === 'boolean') showDecoZone.value = parsed.showDecoZone
    } catch {
      /* ignore malformed */
    } finally {
      configLoaded.value = true
    }
  }

  const persist = () => {
    if (!configLoaded.value) return
    const payload = {
      showTemp: showTemp.value,
      showSegments: showSegments.value,
      showGrid: showGrid.value,
      showNdl: showNdl.value,
      showTts: showTts.value,
      showOtu: showOtu.value,
      showCns: showCns.value,
      showGf: showGf.value,
      showPo2Measured: showPo2Measured.value,
      showPo2Calculated: showPo2Calculated.value,
      showPo2Setpoint: showPo2Setpoint.value,
      showRmv: showRmv.value,
      showDecoZone: showDecoZone.value,
      timestamp: Date.now(),
    }
    safeLocalStorage.setItem(GRAPH_CONFIG_KEY, JSON.stringify(payload))
  }

  load()

  // Which metrics the diver last chose to see, applied to each dive where it has the data (see
  // applyMetricPreferences). The show* refs above get overwritten per dive with those + defaults.
  const metricPreferences = ref<MetricPreferences>(loadMetricPreferences())
  const rememberMetric = (
    scope: keyof MetricPreferences,
    metric: RememberedMetric,
    shown: boolean,
  ) => {
    metricPreferences.value = {
      ...metricPreferences.value,
      [scope]: { ...metricPreferences.value[scope], [metric]: shown },
    }
    safeLocalStorage.setItem(METRIC_PREFS_KEY, JSON.stringify(metricPreferences.value))
  }

  watch(
    [
      showTemp,
      showSegments,
      showGrid,
      showNdl,
      showTts,
      showOtu,
      showCns,
      showGf,
      showPo2Measured,
      showPo2Calculated,
      showPo2Setpoint,
      showRmv,
      showDecoZone,
    ],
    persist,
    { deep: true },
  )

  return {
    showTemp,
    showSegments,
    showGrid,
    showNdl,
    showTts,
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
    metricPreferences,
    rememberMetric,
  }
})
