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
      <div v-else-if="unit" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
        <h1 class="text-2xl font-bold">{{ unit.name }}</h1>
        <p v-if="unit.mountPosition" class="text-sm text-gray-500 dark:text-gray-400">
          {{ CCR_MOUNT_POSITION_LABELS[unit.mountPosition] }}
        </p>
        <p v-if="unit.notes" class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {{ unit.notes }}
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
            :to="{ name: 'DiveList', query: { ccrUnitId: String(unit.id) } }"
            class="text-sm text-blue-600 hover:underline"
          >
            View dives on this unit →
          </router-link>
          <router-link
            :to="{ name: 'ProfileEquipment' }"
            class="text-sm text-blue-600 hover:underline"
          >
            Manage CCR units →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatDate } from '@/lib/utils/timeUtils'
import { useEntityDiveStats } from '@/composables/useEntityDiveStats'
import { CCR_MOUNT_POSITION_LABELS, type CcrUnit } from '@/lib/types/dive'

const route = useRoute()
const { getWithToken } = useApi()

const unit = ref<CcrUnit | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const ccrUnitId = () => route.params.ccrUnitId as string

const stats = useEntityDiveStats(() =>
  unit.value ? `/v1/dives/ccrUnit?ccrUnitId=${unit.value.id}` : null,
)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<CcrUnit>(`/v1/dives/configuration/ccrUnit/${ccrUnitId()}`)
    unit.value = res.data
  } catch {
    error.value = 'Failed to load CCR unit.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
