<template>
  <HomeSkeleton v-if="loading" />

  <div v-else-if="home" class="space-y-3 md:space-y-4">
    <!-- Greeting + CTA -->
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h1 class="text-xl md:text-2xl font-bold text-white">
        Welcome back, {{ home.userName }}
      </h1>
      <RouterLink
        v-if="!readOnly"
        :to="{ name: 'DiveCreate' }"
        class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        <i class="fa fa-plus mr-1" aria-hidden="true"></i>Log dive #{{ home.maxDiveNumber + 1 }}
      </RouterLink>
    </div>

    <!-- Headline tiles (straight on the dimmed background, like DiveView) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
      <div
        v-for="tile in tiles"
        :key="tile.label"
        class="min-w-0 rounded-xl bg-white bg-opacity-90 shadow-md px-3 py-2 text-center"
        :style="{ color: 'var(--foreground)' }"
      >
        <p class="text-xs opacity-80 truncate">{{ tile.label }}</p>
        <p class="font-semibold text-sm">{{ tile.value }}</p>
      </div>
    </div>

    <!-- Activity (adaptive) -->
    <section
      v-if="home.diveCount > 0"
      class="rounded-xl bg-white bg-opacity-90 shadow-md p-3 md:p-5"
      :style="{ color: 'var(--foreground)' }"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 class="text-base md:text-lg font-semibold">{{ framing.headlineLabel }}</h2>
        <RouterLink :to="{ name: 'StatsTimeline' }" class="text-xs text-blue-600 hover:underline">
          Trends →
        </RouterLink>
      </div>
      <p class="mt-1">
        <span class="text-lg font-semibold">{{ framing.dives }}</span>
        {{ framing.dives === 1 ? 'dive' : 'dives' }}
        <span v-if="framing.hours != null" class="text-gray-500 dark:text-gray-400">
          · {{ framing.hours }} h
        </span>
      </p>
      <p
        v-if="framing.comparison"
        class="text-xs"
        :class="comparisonClass(framing.comparison.direction)"
      >
        <i :class="comparisonIcon(framing.comparison.direction)" aria-hidden="true"></i>
        {{ framing.comparison.text }}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {{ framing.footnote }}
        <span v-if="home.divesThisYear > 0"> · {{ home.divesThisYear }} in {{ thisYear }}</span>
      </p>
      <p v-if="framing.staleMonths != null" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
        It's been {{ framing.staleMonths }} months since your last logged dive.
      </p>
    </section>

    <!-- Records -->
    <section v-if="hasRecords" class="rounded-xl bg-white bg-opacity-90 shadow-md p-3 md:p-5" :style="{ color: 'var(--foreground)' }">
      <h2 class="text-base md:text-lg font-semibold">Personal bests</h2>
      <ul class="mt-1 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
        <li v-if="home.records.deepest">
          <RouterLink
            :to="{ name: 'DiveView', params: { diveId: home.records.deepest.diveId } }"
            class="flex items-baseline justify-between gap-2 py-1.5 hover:text-blue-600"
          >
            <span>Deepest — #{{ home.records.deepest.diveNumber }}</span>
            <span class="font-semibold">
              {{ home.records.deepest.maxDepth?.toFixed(1) }} m →
            </span>
          </RouterLink>
        </li>
        <li v-if="home.records.longest">
          <RouterLink
            :to="{ name: 'DiveView', params: { diveId: home.records.longest.diveId } }"
            class="flex items-baseline justify-between gap-2 py-1.5 hover:text-blue-600"
          >
            <span>Longest — #{{ home.records.longest.diveNumber }}</span>
            <span class="font-semibold">
              {{ formatISoDurationToTime(home.records.longest.bottomTime) }} →
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-if="milestone" class="mt-1 text-xs text-blue-600 dark:text-blue-400">
        {{ milestone }}
      </p>
    </section>

    <!-- Recent dives -->
    <section v-if="home.recentDives.length" class="rounded-xl bg-white bg-opacity-90 shadow-md p-3 md:p-5" :style="{ color: 'var(--foreground)' }">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 class="text-base md:text-lg font-semibold">Recent dives</h2>
        <RouterLink :to="{ name: 'DiveList' }" class="text-xs text-blue-600 hover:underline">
          See all →
        </RouterLink>
      </div>
      <ul class="mt-1 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
        <li v-for="d in home.recentDives" :key="d.id">
          <RouterLink
            :to="{ name: 'DiveView', params: { diveId: d.id } }"
            class="flex items-baseline gap-x-2 py-1.5 hover:text-blue-600"
          >
            <span class="font-semibold shrink-0">#{{ d.number }}</span>
            <span class="truncate">{{ d.identifier || d.siteName || 'Dive' }}</span>
            <span class="ml-auto shrink-0 text-xs text-gray-500 dark:text-gray-400">
              {{ shortDate(d.start) }}
              <span v-if="d.maxDepth != null"> · {{ d.maxDepth.toFixed(0) }} m</span>
              <span v-if="d.bottomTime"> · {{ formatISoDurationToTime(d.bottomTime) }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- Buddies -->
    <section v-if="home.topBuddies.length" class="rounded-xl bg-white bg-opacity-90 shadow-md p-3 md:p-5" :style="{ color: 'var(--foreground)' }">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 class="text-base md:text-lg font-semibold">Regular buddies</h2>
        <RouterLink :to="{ name: 'ProfileBuddies' }" class="text-xs text-blue-600 hover:underline">
          All buddies →
        </RouterLink>
      </div>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <span
          v-for="b in home.topBuddies"
          :key="b.name"
          class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200"
        >
          <i class="fas fa-user-group mr-1" aria-hidden="true"></i>{{ b.name }}
          <span class="opacity-60">· {{ b.diveCount }}</span>
        </span>
      </div>
    </section>

    <HomeQuickLinks />
  </div>

  <div v-else class="text-white/80 text-sm">
    Couldn't load your dashboard.
    <button class="underline" @click="load">Retry</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import {
  formatDate,
  formatISoDurationToTime,
  parseISODurationToMinutes,
} from '@/lib/utils/timeUtils'
import { pickActivityFraming } from '@/lib/home/activityFraming'
import type { HomeDashboard as HomeDashboardData } from '@/lib/types/home'
import HomeSkeleton from '@/components/home/HomeSkeleton.vue'
import HomeQuickLinks from '@/components/home/HomeQuickLinks.vue'

const { getWithToken } = useApi()
const { readOnly } = useReadOnlyMode()

const home = ref<HomeDashboardData | null>(null)
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    home.value = (await getWithToken<HomeDashboardData>('/v1/home')).data
  } catch (err) {
    home.value = null
    toast.error(`Couldn't load your home dashboard: ${extractErrorDetail(err)}`)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const framing = computed(() => pickActivityFraming(home.value!))
const thisYear = new Date().getFullYear()

// Date only (no time-of-day) - keeps the recent-dive rows to a single line on mobile.
const shortDate = (ms: number | null | undefined) =>
  ms == null ? '' : new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })

const totalHours = computed(() =>
  home.value?.totalBottomTime == null
    ? null
    : Math.round((parseISODurationToMinutes(home.value.totalBottomTime) / 60) * 10) / 10,
)

const lastDiveLabel = computed(() => {
  const ms = home.value?.lastDiveStart
  if (ms == null) return '—'
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return formatDate(ms).split(',')[0] ?? formatDate(ms)
})

const tiles = computed(() => {
  const h = home.value
  if (!h) return []
  const out: { label: string; value: string | number }[] = [{ label: 'Dives', value: h.diveCount }]
  if (totalHours.value != null) out.push({ label: 'Bottom time', value: `${totalHours.value} h` })
  if (h.maxDepth != null) out.push({ label: 'Deepest', value: `${h.maxDepth.toFixed(1)} m` })
  if (h.lastDiveStart != null) out.push({ label: 'Last dive', value: lastDiveLabel.value })
  return out
})

const hasRecords = computed(
  () => !!(home.value?.records.deepest || home.value?.records.longest),
)

const milestone = computed(() => {
  const n = home.value?.diveCount ?? 0
  const nextCentury = Math.ceil((n + 1) / 100) * 100
  const away = nextCentury - n
  return away > 0 && away <= 5 ? `${away} ${away === 1 ? 'dive' : 'dives'} to your ${nextCentury}th 🎉` : ''
})

const comparisonClass = (dir: 'up' | 'down' | 'flat') =>
  dir === 'up'
    ? 'text-green-600 dark:text-green-400'
    : dir === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-500 dark:text-gray-400'

const comparisonIcon = (dir: 'up' | 'down' | 'flat') =>
  dir === 'up'
    ? 'fa fa-arrow-trend-up mr-1'
    : dir === 'down'
      ? 'fa fa-arrow-trend-down mr-1'
      : 'fa fa-minus mr-1'
</script>
