<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
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

          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'base'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400',
            ]"
            @click="selectStat('base')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-gears text-2xl text-indigo-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">By Base Configuration</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Stats per Configuration</p>
              </div>
            </div>
          </button>

          <button
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedStat === 'tag'
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400',
            ]"
            @click="selectStat('tag')"
          >
            <div class="flex items-center gap-3">
              <i class="fas fa-tags text-2xl text-purple-600"></i>
              <div class="text-left">
                <h3 class="font-semibold">By Tag</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Stats per tag or combination</p>
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

      <!-- Base Configuration Stats -->
      <div v-else-if="selectedStat === 'base'" class="space-y-6">
        <div
          v-for="item in baseStats"
          :key="item.key"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-gear mr-2 text-indigo-600"></i>{{ baseConfigLabel(item.key) }}
          </h2>
          <StatCard :stats="item.stats" />
        </div>
      </div>

      <!-- Tag Stats -->
      <div v-else-if="selectedStat === 'tag'" class="space-y-6">
        <!-- Tag combination picker -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 class="text-lg font-semibold mb-3">Filter by tag combination</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Select multiple tags to see stats for dives that have <strong>all</strong> of them.
          </p>
          <div v-if="tagStats.length" class="flex flex-wrap gap-2">
            <button
              v-for="item in tagStats"
              :key="item.key.id"
              type="button"
              :class="[
                'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                selectedTagFilter.has(item.key.id)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
              ]"
              @click="toggleTagFilter(item.key.id)"
            >
              {{ item.key.name }}
              <span class="ml-1 opacity-60 text-xs">{{ item.key.diveCount }}</span>
            </button>
          </div>
          <p v-else class="text-sm text-gray-400 italic">No tagged dives yet.</p>

          <button
            v-if="selectedTagFilter.size"
            @click="selectedTagFilter = new Set()"
            class="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          >
            Clear filter
          </button>
        </div>

        <!-- Combination stats -->
        <div
          v-if="selectedTagFilter.size > 0"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
        >
          <h2 class="text-xl font-bold mb-1">
            <i class="fas fa-layer-group mr-2 text-purple-600"></i>
            Combination: {{ selectedTagNames }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Dives carrying <strong>all</strong> selected tags
          </p>
          <div v-if="tagFilterLoading" class="text-gray-400 text-sm">Loading…</div>
          <div v-else-if="tagFilterStats">
            <p
              v-if="tagFilterStats.diveCount === 0"
              class="text-gray-400 italic text-sm"
            >
              No dives match this combination.
            </p>
            <StatCard v-else :stats="tagFilterStats" />
          </div>
        </div>

        <!-- Per-tag breakdown -->
        <div v-if="tagStats.length" class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-600 dark:text-gray-300 px-1">
            Individual tag breakdown
          </h2>
          <div
            v-for="item in tagStats"
            :key="item.key.id"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <h2 class="text-xl font-bold mb-1">
              <span
                class="inline-block px-2.5 py-0.5 rounded-full text-sm font-medium mr-2"
                :class="
                  item.key.autoDetectRule
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                "
              >
                {{ item.key.name }}
              </span>
              <span class="text-sm font-normal text-gray-400">
                {{ item.key.diveCount }} {{ item.key.diveCount === 1 ? 'dive' : 'dives' }}
              </span>
            </h2>
            <StatCard :stats="item.stats" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import StatCard from '@/components/StatCard.vue'
import type {
  UserDiveStats,
  UserDiveStatsByYear,
  UserDiveStatsBySite,
  UserDiveStatsByBuddy,
  UserDiveStatsByBaseConfiguration,
  UserDiveStatsByTag,
} from '@/lib/types/stats'
import { BASE_CONFIGURATION_LABELS, type BaseConfiguration } from '@/lib/types/dive'

const router = useRouter()
const route = useRoute()
const { getWithToken } = useApi()

type StatType = 'overall' | 'year' | 'site' | 'buddy' | 'base' | 'tag'

const selectedStat = ref<StatType>('overall')
const loading = ref(false)
const error = ref<string | null>(null)

// Cache for each stat type
const cache = ref<{
  overall: UserDiveStats | null
  year: UserDiveStatsByYear | null
  site: UserDiveStatsBySite[] | null
  buddy: UserDiveStatsByBuddy[] | null
  base: UserDiveStatsByBaseConfiguration[] | null
  tag: UserDiveStatsByTag[] | null
}>({
  overall: null,
  year: null,
  site: null,
  buddy: null,
  base: null,
  tag: null,
})

const overallStats = computed(() => cache.value.overall)
const yearStats = computed(() => cache.value.year || [])
const siteStats = computed(() => cache.value.site || [])
const buddyStats = computed(() => cache.value.buddy || [])
const baseStats = computed(() => cache.value.base || [])
const tagStats = computed(() => cache.value.tag || [])

// Tag combination filter state
const selectedTagFilter = ref<Set<number>>(new Set())
const tagFilterStats = ref<UserDiveStats | null>(null)
const tagFilterLoading = ref(false)

const selectedTagNames = computed(() =>
  tagStats.value
    .filter((item) => selectedTagFilter.value.has(item.key.id))
    .map((item) => item.key.name)
    .join(' + '),
)

const toggleTagFilter = async (tagId: number) => {
  const next = new Set(selectedTagFilter.value)
  if (next.has(tagId)) {
    next.delete(tagId)
  } else {
    next.add(tagId)
  }
  selectedTagFilter.value = next
  if (next.size === 0) {
    tagFilterStats.value = null
    return
  }
  tagFilterLoading.value = true
  try {
    const params = [...next].map((id) => `tagIds=${id}`).join('&')
    const res = await getWithToken<UserDiveStats>(`/v1/stats/tags?${params}`)
    tagFilterStats.value = res.data
  } catch {
    tagFilterStats.value = null
  } finally {
    tagFilterLoading.value = false
  }
}

const baseConfigLabel = (key: BaseConfiguration) => BASE_CONFIGURATION_LABELS[key]

const selectStat = async (stat: StatType) => {
  // Ignore if clicking the same stat that's already selected
  if (selectedStat.value === stat) {
    return
  }

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
    } else if (stat === 'base') {
      url += '/base-configuration'
    } else if (stat === 'tag') {
      url += '/by-tag'
    }

    type StatsResponse =
      | UserDiveStats
      | UserDiveStatsByYear
      | UserDiveStatsBySite[]
      | UserDiveStatsByBuddy[]
      | UserDiveStatsByBaseConfiguration[]
      | UserDiveStatsByTag[]
    const response = await getWithToken<StatsResponse>(url)

    if (stat === 'overall') {
      cache.value.overall = response.data as UserDiveStats
    } else if (stat === 'year') {
      cache.value.year = response.data as UserDiveStatsByYear
    } else if (stat === 'site') {
      cache.value.site = response.data as UserDiveStatsBySite[]
    } else if (stat === 'buddy') {
      cache.value.buddy = response.data as UserDiveStatsByBuddy[]
    } else if (stat === 'base') {
      cache.value.base = response.data as UserDiveStatsByBaseConfiguration[]
    } else if (stat === 'tag') {
      cache.value.tag = response.data as UserDiveStatsByTag[]
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load statistics'
  } finally {
    loading.value = false
  }
}

const getInitialStatType = (): StatType => {
  const queryType = route.query.type as string | undefined
  if (queryType && ['overall', 'year', 'site', 'buddy', 'base', 'tag'].includes(queryType)) {
    return queryType as StatType
  }
  return 'overall'
}

onMounted(() => {
  // Load stat from query param or default to overall
  const initialStat = getInitialStatType()
  selectedStat.value = initialStat
  loadStat(initialStat)
})

// Watch for query parameter changes (e.g., browser back/forward)
watch(
  () => route.query.type,
  () => {
    const stat = getInitialStatType()
    selectedStat.value = stat
    loadStat(stat)
  },
)
</script>
