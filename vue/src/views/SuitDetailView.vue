<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-2xl">
      <div v-if="loading" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
      </div>
      <div
        v-else-if="error"
        class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6"
      >
        <p class="text-red-700 dark:text-red-300">{{ error }}</p>
      </div>
      <div v-else-if="suit" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <h1 class="text-2xl font-bold">{{ displayName }}</h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ SUIT_TYPE_LABELS[suit.type] }}<span v-if="suit.thickness"> &middot; {{ suit.thickness }} mm</span>
        </p>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Dives</p>
            <p class="text-lg font-semibold">{{ stats.diveCount }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">First used</p>
            <p class="text-lg font-semibold">{{ stats.firstDate ? formatDate(stats.firstDate) : '—' }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Last used</p>
            <p class="text-lg font-semibold">{{ stats.lastDate ? formatDate(stats.lastDate) : '—' }}</p>
          </div>
        </div>

        <div class="flex gap-4">
          <router-link
            :to="{ name: 'DiveList', query: { suitId: String(suit.id) } }"
            class="text-sm text-blue-600 hover:underline"
          >
            View dives with this suit →
          </router-link>
          <router-link
            :to="{ name: 'ProfileEquipment' }"
            class="text-sm text-blue-600 hover:underline"
          >
            Manage suits →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatDate } from '@/lib/utils/timeUtils'
import { useEntityDiveStats } from '@/composables/useEntityDiveStats'
import { SUIT_TYPE_LABELS, type Suit } from '@/lib/types/dive'

const route = useRoute()
const { getWithToken } = useApi()

const suit = ref<Suit | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const suitId = () => route.params.suitId as string

// The suit's own `notes` field doubles as its display name in this app (see
// SuitManagement.vue/SuitSelector.vue's own "Name: ..." convention) - there's no separate name
// column. Falls back to the formatted type when notes is empty, same as those two components.
const displayName = computed(() => {
  const notes = suit.value?.notes?.trim()
  return notes || (suit.value ? SUIT_TYPE_LABELS[suit.value.type] : '')
})

const stats = useEntityDiveStats(() =>
  suit.value ? `/v1/dives/suit?suitId=${suit.value.id}` : null,
)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<Suit>(`/v1/dives/configuration/suit/${suitId()}`)
    suit.value = res.data
  } catch {
    error.value = 'Failed to load suit.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
