<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-2xl space-y-4">
      <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between gap-4 mb-1">
          <h1 class="text-2xl font-bold">Suggest a Dive Site</h1>
          <button
            v-if="!loading"
            type="button"
            class="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100"
            @click="load"
          >
            <i class="fas fa-rotate mr-1"></i>Refresh
          </button>
        </div>
        <p class="text-sm text-gray-500">
          Scored against your own dive history - a mix of revisits you're due for, sites with
          standout conditions, and a few underrated finds. Not deterministic - refresh for a
          different mix.
        </p>
        <p v-if="locationDenied" class="text-xs text-gray-400 italic mt-2">
          Location unavailable - showing suggestions without a proximity factor.
          <button type="button" class="text-blue-600 hover:underline" @click="load">
            Try again
          </button>
        </p>
        <div class="mt-3">
          <p class="text-xs font-medium text-gray-500 mb-1.5">How far are you willing to go?</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in DISTANCE_OPTIONS"
              :key="option.km"
              type="button"
              class="text-xs px-2.5 py-1 rounded-full border"
              :class="
                distancePreferenceKm === option.km
                  ? 'bg-blue-600 border-blue-600 text-white!'
                  : 'border-gray-300 hover:bg-gray-100'
              "
              @click="selectDistance(option.km)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <LoadingProgress v-if="loading" :messages="loadingMessages" icon="compass" />

      <div v-else-if="error" class="suggestion-error rounded-xl border p-6">
        {{ error }}
      </div>

      <p
        v-else-if="!suggestions.length"
        class="bg-white rounded-xl shadow-md p-8 text-center text-sm text-gray-400 italic"
      >
        No suggestions yet - log a few more dives, or check back once other divers have logged some
        near you.
      </p>

      <template v-else>
        <ul class="space-y-3">
          <li v-for="s in topPicks" :key="s.site.id" class="top-pick-card rounded-xl shadow-md p-5">
            <span class="top-pick-badge">
              <i class="fas fa-star mr-1"></i
              >{{ topPicks.length > 1 ? 'Tied top pick' : 'Top pick' }}
            </span>
            <SuggestionCard :suggestion="s" />
          </li>
        </ul>

        <template v-if="morePicks.length">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-1">
            More to consider
          </p>
          <ul class="space-y-3">
            <li v-for="s in morePicks" :key="s.site.id" class="bg-white rounded-xl shadow-md p-5">
              <SuggestionCard :suggestion="s" />
            </li>
          </ul>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import LoadingProgress from '@/components/ui/LoadingProgress.vue'
import SuggestionCard from '@/components/dive/SuggestionCard.vue'
import type { DiveSiteSuggestion } from '@/lib/types/dive'

const { getWithToken } = useApi()

const suggestions = ref<DiveSiteSuggestion[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const locationDenied = ref(false)

const DISTANCE_OPTIONS = [
  { label: 'Nearby', km: 20 },
  { label: 'Short drive', km: 50 },
  { label: 'Day trip', km: 100 },
  { label: 'Road trip', km: 250 },
  { label: 'Anywhere', km: 1000 },
] as const
const distancePreferenceKm = ref<number>(50)

const topPicks = computed(() => suggestions.value.filter((s) => s.topPick))
const morePicks = computed(() => suggestions.value.filter((s) => !s.topPick))

const loadingMessages = [
  'Dusting off your dive log…',
  'Comparing visibility notes with the neighbours…',
  'Asking around who has been diving lately…',
  'Digging up a few hidden gems…',
  'Sizing up the depths for your comfort zone…',
]

const getLocation = (): Promise<GeolocationPosition | null> => {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const position = await getLocation()
    locationDenied.value = position === null
    const params: Record<string, number> = { limit: 12 }
    if (position) {
      params.lat = position.coords.latitude
      params.lon = position.coords.longitude
      params.maxDistanceKm = distancePreferenceKm.value
    }
    const res = await getWithToken<DiveSiteSuggestion[]>('/v1/dives/sites/suggestions', {
      params,
    })
    suggestions.value = res.data ?? []
  } catch (err) {
    error.value = `Failed to load suggestions: ${extractErrorDetail(err)}`
  } finally {
    loading.value = false
  }
}

const selectDistance = (km: number) => {
  if (distancePreferenceKm.value === km) return
  distancePreferenceKm.value = km
  load()
}

onMounted(load)
</script>

<style scoped>
.suggestion-error {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #b91c1c;
}

[data-theme='dark'] .suggestion-error {
  background-color: rgba(127, 29, 29, 0.2);
  border-color: #b91c1c;
  color: #fca5a5;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .suggestion-error {
    background-color: rgba(127, 29, 29, 0.2);
    border-color: #b91c1c;
    color: #fca5a5;
  }
}

.top-pick-card {
  background-color: #fffbeb;
  border: 2px solid #fbbf24;
}

.top-pick-badge {
  display: inline-block;
  margin-bottom: 0.4rem;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  background-color: #fbbf24;
  color: #78350f;
}

[data-theme='dark'] .top-pick-card {
  background-color: rgba(120, 53, 15, 0.2);
  border-color: #b45309;
}

[data-theme='dark'] .top-pick-badge {
  background-color: #b45309;
  color: #fef3c7;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .top-pick-card {
    background-color: rgba(120, 53, 15, 0.2);
    border-color: #b45309;
  }

  :root:not([data-theme]) .top-pick-badge {
    background-color: #b45309;
    color: #fef3c7;
  }
}
</style>
