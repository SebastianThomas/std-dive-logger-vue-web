<template>
  <div class="min-h-[calc(100vh-70px)] flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-4xl">
      <!-- Stat Type Selector -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h1 class="text-2xl font-bold mb-6">Dive Statistics</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'overall'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400',
            ]"
            @click="selectStat('overall')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-chart-line text-2xl text-blue-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">Overall Stats</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Total dives and achievements</p>
              </div>
            </div>
          </button>

          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'year'
                ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-400',
            ]"
            @click="selectStat('year')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-calendar text-2xl text-green-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">By Year</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Stats broken down by year</p>
              </div>
            </div>
          </button>

          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'site'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400',
            ]"
            @click="selectStat('site')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-map-pin text-2xl text-purple-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">By Dive Site</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Stats per location</p>
              </div>
            </div>
          </button>

          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'buddy'
                ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-orange-400',
            ]"
            @click="selectStat('buddy')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-people-group text-2xl text-orange-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">By Buddy</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Stats per dive buddy</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Stats Display -->
      <div v-if="loading" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div class="flex justify-center mb-4">
          <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
        </div>
        <p class="text-gray-600 dark:text-gray-400">Loading statistics...</p>
      </div>

      <div
        v-else-if="error"
        class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6"
      >
        <h3 class="font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Stats</h3>
        <p class="text-red-700 dark:text-red-300">{{ error }}</p>
      </div>

      <!-- Overall Stats -->
      <div v-else-if="selectedStat === 'overall' && overallStats" class="space-y-6">
        <StatCard :stats="overallStats" />
      </div>

      <!-- Year Stats -->
      <div v-else-if="selectedStat === 'year'" class="space-y-6">
        <div
          v-for="[year, item] of Object.entries(yearStats)"
          :key="year"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h2 class="text-xl font-bold mb-4">{{ year }}</h2>
          <StatCard :stats="item" />
        </div>
      </div>

      <!-- Site Stats -->
      <div v-else-if="selectedStat === 'site'" class="space-y-6">
        <div
          v-for="item in siteStats"
          :key="item.key.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h2 class="text-xl font-bold mb-2">
            <i class="fas fa-map-pin mr-2 text-purple-600"></i>{{ item.key.name }}
          </h2>
          <StatCard :stats="item.stats" />
        </div>
      </div>

      <!-- Buddy Stats -->
      <div v-else-if="selectedStat === 'buddy'" class="space-y-6">
        <div
          v-for="item in buddyStats"
          :key="item.key"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-user mr-2 text-orange-600"></i>{{ item.key || 'Unknown' }}
          </h2>
          <StatCard :stats="item.stats" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import StatCard from '@/components/StatCard.vue'
import type {
  UserDiveStats,
  UserDiveStatsByYear,
  UserDiveStatsBySite,
  UserDiveStatsByBuddy,
} from '@/lib/types/stats'

const router = useRouter()
const route = useRoute()
const { getWithToken } = useApi()

type StatType = 'overall' | 'year' | 'site' | 'buddy'

const selectedStat = ref<StatType>('overall')
const loading = ref(false)
const error = ref<string | null>(null)

// Cache for each stat type
const cache = ref<{
  overall: UserDiveStats | null
  year: UserDiveStatsByYear | null
  site: UserDiveStatsBySite[] | null
  buddy: UserDiveStatsByBuddy[] | null
}>({
  overall: null,
  year: null,
  site: null,
  buddy: null,
})

const overallStats = computed(() => cache.value.overall)
const yearStats = computed(() => cache.value.year || [])
const siteStats = computed(() => cache.value.site || [])
const buddyStats = computed(() => cache.value.buddy || [])

const selectStat = async (stat: StatType) => {
  selectedStat.value = stat

  // Update URL query parameter
  router.push({ name: 'Stats', query: { type: stat } })

  // If already cached, don't reload
  if (cache.value[stat] !== null) {
    return
  }

  await loadStat(stat)
}

const loadStat = async (stat: StatType) => {
  loading.value = true
  error.value = null

  try {
    let url = '/v1/stats'
    if (stat === 'year') {
      url += '/year'
    } else if (stat === 'site') {
      url += '/dive-site'
    } else if (stat === 'buddy') {
      url += '/buddy'
    }

    type StatsResponse =
      | UserDiveStats
      | UserDiveStatsByYear
      | UserDiveStatsBySite[]
      | UserDiveStatsByBuddy[]
    const response = await getWithToken<StatsResponse>(url)

    if (stat === 'overall') {
      cache.value.overall = response.data as UserDiveStats
    } else if (stat === 'year') {
      cache.value.year = response.data as UserDiveStatsByYear
    } else if (stat === 'site') {
      cache.value.site = response.data as UserDiveStatsBySite[]
    } else if (stat === 'buddy') {
      cache.value.buddy = response.data as UserDiveStatsByBuddy[]
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load statistics'
  } finally {
    loading.value = false
  }
}

// Clear cache when navigating away
const handleRouteChange = () => {
  cache.value = {
    overall: null,
    year: null,
    site: null,
    buddy: null,
  }
}

const getInitialStatType = (): StatType => {
  const queryType = route.query.type as string | undefined
  if (queryType && ['overall', 'year', 'site', 'buddy'].includes(queryType)) {
    return queryType as StatType
  }
  return 'overall'
}

onMounted(() => {
  router.afterEach(handleRouteChange)
  // Load stat from query param or default to overall
  const initialStat = getInitialStatType()
  selectedStat.value = initialStat
  loadStat(initialStat)
})

onBeforeUnmount(() => {
  router.afterEach(handleRouteChange)
})
</script>
