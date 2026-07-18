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
        </p>
      </div>

      <StatsFilterBar
        v-model:granularity="granularity"
        v-model="filters"
      />

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div class="flex flex-wrap gap-4 items-start justify-between mb-4">
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">Metrics</h3>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="metric in NUMERIC_METRICS"
                :key="metric"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4"
                  :checked="selectedMetrics.has(metric)"
                  @change="toggleMetric(metric)"
                />
                <span
                  class="font-medium text-sm"
                  :style="{ color: DEFAULT_TIMELINE_METRIC_CONFIGS[metric].color }"
                >
                  {{ timelineMetricDisplayNames[metric] }}
                </span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">Breakdown</h3>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="metric in CATEGORICAL_METRICS"
                :key="metric"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4"
                  :checked="selectedCategorical.has(metric)"
                  @change="toggleCategorical(metric)"
                />
                <span
                  class="font-medium text-sm"
                  :style="{ color: DEFAULT_TIMELINE_CATEGORICAL_CONFIGS[metric].color }"
                >
                  {{ timelineCategoricalDisplayNames[metric] }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="selectedMetrics.size > 1" class="flex flex-wrap gap-4 items-center mb-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-500 dark:text-gray-400">Left axis:</span>
            <select
              v-model="leftAxisMetric"
              class="border rounded px-2 py-1 dark:bg-gray-900 dark:text-white dark:border-gray-600"
            >
              <option v-for="metric in [...selectedMetrics]" :key="metric" :value="metric">
                {{ timelineMetricDisplayNames[metric] }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500 dark:text-gray-400">Right axis:</span>
            <select
              v-model="rightAxisMetric"
              class="border rounded px-2 py-1 dark:bg-gray-900 dark:text-white dark:border-gray-600"
            >
              <option v-for="metric in [...selectedMetrics]" :key="metric" :value="metric">
                {{ timelineMetricDisplayNames[metric] }}
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
            :selected-metrics="[...selectedMetrics]"
            :selected-categorical="[...selectedCategorical]"
            v-model:left-axis-metric="leftAxisMetric"
            v-model:right-axis-metric="rightAxisMetric"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import StatsFilterBar from '@/components/stats/StatsFilterBar.vue'
import StatsTimelineChart from '@/components/stats/StatsTimelineChart.vue'
import type {
  StatsTimeSeries,
  StatsTimelineFilters,
  TimelineGranularity,
  TimelineMetric,
  TimelineCategoricalMetric,
} from '@/lib/types/statsTimeline'
import {
  EMPTY_TIMELINE_FILTERS,
  DEFAULT_TIMELINE_METRIC_CONFIGS,
  DEFAULT_TIMELINE_CATEGORICAL_CONFIGS,
  timelineMetricDisplayNames,
  timelineCategoricalDisplayNames,
} from '@/lib/types/statsTimeline'

const NUMERIC_METRICS: TimelineMetric[] = [
  'diveCount',
  'avgRmv',
  'maxDepth',
  'avgDepth',
  'totalDiveTime',
  'maxDiveTime',
  'avgEndCns',
  'avgTemperature',
  'avgVisibility',
  'avgWeight',
]

const CATEGORICAL_METRICS: TimelineCategoricalMetric[] = ['suitUsage', 'baseConfigUsage']

const { getWithToken } = useApi()

const granularity = ref<TimelineGranularity>('MONTH')
const filters = ref<StatsTimelineFilters>({ ...EMPTY_TIMELINE_FILTERS })

const selectedMetrics = ref<Set<TimelineMetric>>(
  new Set(
    NUMERIC_METRICS.filter((m) => DEFAULT_TIMELINE_METRIC_CONFIGS[m].show),
  ),
)
const selectedCategorical = ref<Set<TimelineCategoricalMetric>>(new Set())

const leftAxisMetric = ref<TimelineMetric>('maxDepth')
const rightAxisMetric = ref<TimelineMetric>('diveCount')

const series = ref<StatsTimeSeries | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const toggleMetric = (metric: TimelineMetric) => {
  const next = new Set(selectedMetrics.value)
  if (next.has(metric)) {
    next.delete(metric)
  } else {
    next.add(metric)
  }
  selectedMetrics.value = next
}

const toggleCategorical = (metric: TimelineCategoricalMetric) => {
  const next = new Set(selectedCategorical.value)
  if (next.has(metric)) {
    next.delete(metric)
  } else {
    next.add(metric)
  }
  selectedCategorical.value = next
}

const buildQuery = (): string => {
  const params: string[] = [`granularity=${granularity.value}`]
  if (filters.value.query) params.push(`query=${encodeURIComponent(filters.value.query)}`)
  if (filters.value.diveSiteId) params.push(`diveSiteId=${filters.value.diveSiteId}`)
  if (filters.value.suitId) params.push(`suitId=${filters.value.suitId}`)
  if (filters.value.baseConfiguration)
    params.push(`baseConfiguration=${filters.value.baseConfiguration}`)
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

watch([granularity, filters], fetchSeries, { deep: true })

onMounted(fetchSeries)
</script>
