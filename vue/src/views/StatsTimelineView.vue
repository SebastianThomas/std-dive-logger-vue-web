<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8 pb-10">
    <div class="w-full max-w-6xl space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h1 class="text-2xl font-bold">Stats Over Time</h1>
          <RouterLink :to="{ name: 'Stats' }" class="text-sm text-blue-600 hover:underline">
            ← Back to overview stats
          </RouterLink>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pick a granularity, filter your dives, and combine any metrics you want to compare.
          Click a point on the chart to jump to it, or drag across a range to open those dives in
          the dive list.
        </p>
      </div>

      <StatsFilterBar
        v-model:granularity="granularity"
        v-model="filters"
      />

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div class="flex flex-wrap gap-4 items-start justify-between mb-4">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">Metrics</h3>
              <StyledCheckbox v-model="combineMode" title="Tap multiple same-unit metrics without holding shift">
                <span class="text-xs text-gray-500 dark:text-gray-400">Combine</span>
              </StyledCheckbox>
            </div>
            <div class="flex flex-wrap gap-3">
              <StyledCheckbox
                v-for="metric in NUMERIC_METRICS"
                :key="metric"
                :model-value="selectedMetrics.has(metric)"
                :color="DEFAULT_TIMELINE_METRIC_CONFIGS[metric].color"
                :title="`Click to show only this metric. Shift+click (or Combine) to compare it with other ${timelineMetricUnits[metric] ?? 'count'}-based metrics.`"
                @click="handleMetricClick(metric, $event)"
              >
                <span
                  class="font-medium text-sm"
                  :style="{ color: DEFAULT_TIMELINE_METRIC_CONFIGS[metric].color }"
                >
                  {{ timelineMetricDisplayNames[metric] }}
                </span>
              </StyledCheckbox>
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">Break down by</h3>
            <select
              v-model="breakdownBy"
              class="border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:text-white dark:border-gray-600"
            >
              <option v-for="opt in BREAKDOWN_DIMENSIONS" :key="opt.label" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="text-center py-16 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
        <div v-else-if="error" class="text-center py-16 text-red-500">{{ error }}</div>
        <div v-else-if="!series?.points.length" class="text-center py-16 text-gray-400 italic">
          No dives match the current filters.
        </div>
        <div v-else class="relative h-100">
          <StatsTimelineChart
            :series="series"
            :granularity="granularity"
            :selected-metrics="selectedMetricsList"
            :breakdown-by="breakdownBy"
            @point-click="handlePointClick"
            @range-select="handleRangeSelect"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import StatsFilterBar from '@/components/stats/StatsFilterBar.vue'
import StatsTimelineChart from '@/components/stats/StatsTimelineChart.vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'
import type {
  StatsTimeSeries,
  StatsTimeSeriesPoint,
  StatsTimelineFilters,
  TimelineGranularity,
  TimelineMetric,
  StatsBreakdownDimension,
} from '@/lib/types/statsTimeline'
import {
  EMPTY_TIMELINE_FILTERS,
  DEFAULT_TIMELINE_METRIC_CONFIGS,
  BREAKDOWN_DIMENSIONS,
  timelineMetricDisplayNames,
  timelineMetricUnits,
} from '@/lib/types/statsTimeline'
import { toggleMetricSelection } from '@/lib/stats/timelineMetricSelection'
import { clampedCycleIndex } from '@/lib/utils/cycle'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'

const NUMERIC_METRICS: TimelineMetric[] = [
  'diveCount',
  'avgRmv',
  'avgBailoutRmv',
  'maxDepth',
  'avgDepth',
  'totalDiveTime',
  'maxDiveTime',
  'avgEndCns',
  'avgTemperature',
  'avgVisibility',
  'avgWeight',
]

const { getWithToken } = useApi()
const router = useRouter()

// Settings are kept for the browser session (sessionStorage) so navigating away from this page
// and back — e.g. to /stats or a linked dive list — doesn't reset granularity/filters/metrics.
const TIMELINE_SETTINGS_KEY = 'stats-timeline-settings'
type PersistedSettings = {
  granularity: TimelineGranularity
  filters: StatsTimelineFilters
  selectedMetrics: TimelineMetric[]
  breakdownBy: StatsBreakdownDimension | null
  combineMode: boolean
}

const loadPersistedSettings = (): Partial<PersistedSettings> => {
  if (typeof sessionStorage === 'undefined' || sessionStorage === null) return {}
  try {
    const raw = sessionStorage.getItem(TIMELINE_SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Partial<PersistedSettings>) : {}
  } catch {
    return {}
  }
}

const persisted = loadPersistedSettings()

const granularity = ref<TimelineGranularity>(persisted.granularity ?? 'MONTH')
const filters = ref<StatsTimelineFilters>(persisted.filters ?? { ...EMPTY_TIMELINE_FILTERS })

const selectedMetrics = ref<Set<TimelineMetric>>(
  new Set(
    persisted.selectedMetrics ??
      NUMERIC_METRICS.filter((m) => DEFAULT_TIMELINE_METRIC_CONFIGS[m].show),
  ),
)
const breakdownBy = ref<StatsBreakdownDimension | null>(persisted.breakdownBy ?? null)
const combineMode = ref<boolean>(persisted.combineMode ?? false)

// Stable array reference for StatsTimelineChart's props.selectedMetrics: this only recomputes when
// selectedMetrics.value itself is reassigned (see handleMetricClick), not on every parent re-render
// (e.g. toggling combineMode) — an inline `[...selectedMetrics]` literal in the template would
// instead produce a brand-new array on every render, defeating the chart's props watcher.
const selectedMetricsList = computed(() => [...selectedMetrics.value])

const series = ref<StatsTimeSeries | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const persistSettings = () => {
  if (typeof sessionStorage === 'undefined' || sessionStorage === null) return
  try {
    const toPersist: PersistedSettings = {
      granularity: granularity.value,
      filters: filters.value,
      selectedMetrics: [...selectedMetrics.value],
      breakdownBy: breakdownBy.value,
      combineMode: combineMode.value,
    }
    sessionStorage.setItem(TIMELINE_SETTINGS_KEY, JSON.stringify(toPersist))
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

watch(
  [granularity, filters, selectedMetrics, breakdownBy, combineMode],
  persistSettings,
  { deep: true },
)

// Plain click selects only that metric; shift+click (or the "Combine" toggle, for touch devices
// without a shift key) adds/removes it instead, so long as its unit is compatible with what's
// already selected. See toggleMetricSelection's own doc comment for why this used to look broken.
const handleMetricClick = (metric: TimelineMetric, event: MouseEvent) => {
  const wantsCombine = event.shiftKey || combineMode.value
  selectedMetrics.value = toggleMetricSelection(selectedMetrics.value, metric, wantsCombine)
}

// 'n'/'p' step through NUMERIC_METRICS one at a time, replacing the current selection (including
// any combined set) with a single metric - clamped at either end rather than wrapping, matching
// the dive list's page-forward/back behavior. Based on the first currently-selected metric's
// position, so it does something sensible even mid-combine.
const cycleMetric = (direction: 1 | -1) => {
  const current = NUMERIC_METRICS.find((m) => selectedMetrics.value.has(m)) ?? NUMERIC_METRICS[0]!
  const currentIndex = NUMERIC_METRICS.indexOf(current)
  const nextIndex = clampedCycleIndex(currentIndex, NUMERIC_METRICS.length, direction)
  selectedMetrics.value = new Set([NUMERIC_METRICS[nextIndex]!])
}

const handleTimelineKeydown = (event: KeyboardEvent) => {
  if (isTypingTarget(event.target)) return
  if (event.ctrlKey || event.metaKey) return

  if (event.key.toLowerCase() === 'n') {
    cycleMetric(1)
  }
  if (event.key.toLowerCase() === 'p') {
    cycleMetric(-1)
  }
  // 1-9 then 0 jump straight to the first ten metrics by position in NUMERIC_METRICS, same fixed
  // order n/p step through - replaces the current selection, same as cycleMetric. Any metric past
  // the tenth (currently just 'avgWeight') is reachable only via n/p or its checkbox.
  if (/^[0-9]$/.test(event.key)) {
    const index = event.key === '0' ? 9 : Number(event.key) - 1
    const metric = NUMERIC_METRICS[index]
    if (metric) selectedMetrics.value = new Set([metric])
  }
  // 'c' toggles Combine mode, same as its checkbox in the metrics row above.
  if (event.key.toLowerCase() === 'c') {
    combineMode.value = !combineMode.value
  }
}

const navigateToDiveList = (startMs: number, endMs: number) => {
  router.push({
    name: 'DiveList',
    query: {
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
      tagIds: filters.value.tagIds.length ? filters.value.tagIds.map(String) : undefined,
      diveSiteId: filters.value.diveSiteId ? String(filters.value.diveSiteId) : undefined,
      suitId: filters.value.suitId ? String(filters.value.suitId) : undefined,
      ccrUnitId: filters.value.ccrUnitId ? String(filters.value.ccrUnitId) : undefined,
      baseConfiguration: filters.value.baseConfiguration ?? undefined,
      search: filters.value.query || undefined,
    },
  })
}

const handlePointClick = (point: StatsTimeSeriesPoint, bucketEndMs: number) => {
  if (point.diveId !== undefined) {
    router.push({ name: 'DiveView', params: { diveId: point.diveId } })
    return
  }
  navigateToDiveList(point.bucketStart, bucketEndMs)
}

const handleRangeSelect = (startMs: number, endMs: number) => {
  navigateToDiveList(startMs, endMs)
}

const buildQuery = (): string => {
  const params: string[] = [`granularity=${granularity.value}`]
  if (filters.value.query) params.push(`query=${encodeURIComponent(filters.value.query)}`)
  if (filters.value.diveSiteId) params.push(`diveSiteId=${filters.value.diveSiteId}`)
  if (filters.value.suitId) params.push(`suitId=${filters.value.suitId}`)
  if (filters.value.ccrUnitId) params.push(`ccrUnitId=${filters.value.ccrUnitId}`)
  if (filters.value.baseConfiguration)
    params.push(`baseConfiguration=${filters.value.baseConfiguration}`)
  if (breakdownBy.value) params.push(`breakdownBy=${breakdownBy.value}`)
  filters.value.tagIds.forEach((id) => params.push(`tagIds=${id}`))
  return params.join('&')
}

const fetchSeries = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<StatsTimeSeries>(`/v1/stats/timeseries?${buildQuery()}`)
    series.value = res.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load stats'
    series.value = null
  } finally {
    loading.value = false
  }
}

watch([granularity, filters, breakdownBy], fetchSeries, { deep: true })

onMounted(() => {
  fetchSeries()
  window.addEventListener('keydown', handleTimelineKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleTimelineKeydown)
})
</script>
