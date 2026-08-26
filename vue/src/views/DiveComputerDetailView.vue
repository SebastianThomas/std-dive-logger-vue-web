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
      <div
        v-else-if="computer"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4"
      >
        <input
          :value="computer.customIdentifier"
          type="text"
          class="text-2xl font-bold w-full p-1 -ml-1 rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          @blur="renameComputer(($event.target as HTMLInputElement).value)"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ computer.manufacturer.name }}
          <span v-if="computer.serialNumber"> &middot; S/N {{ computer.serialNumber }}</span>
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

        <router-link
          :to="{ name: 'DiveList', query: { computerId: String(computer.id) } }"
          class="text-sm text-blue-600 hover:underline"
        >
          View dives with this computer →
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { formatDate } from '@/lib/utils/timeUtils'
import { useEntityDiveStats } from '@/composables/useEntityDiveStats'
import type { DiveComputer } from '@/lib/types/dive'

const route = useRoute()
const { getWithToken, putWithToken } = useApi()

const computer = ref<DiveComputer | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const computerId = () => route.params.computerId as string

const stats = useEntityDiveStats(() =>
  computer.value ? `/v1/dives/computer?computerId=${computer.value.id}` : null,
)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<DiveComputer>(`/v1/computers/${computerId()}`)
    computer.value = res.data
  } catch {
    error.value = 'Failed to load dive computer.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const renameComputer = async (name: string) => {
  const trimmed = name.trim()
  if (!computer.value || trimmed === '' || trimmed === computer.value.customIdentifier) {
    return
  }
  const previous = computer.value.customIdentifier
  computer.value = { ...computer.value, customIdentifier: trimmed }
  try {
    await putWithToken(`/v1/computers/${computer.value.id}`, {
      customIdentifier: trimmed,
      ccrUnitId: computer.value.ccrUnitId,
    })
  } catch (err) {
    computer.value = { ...computer.value, customIdentifier: previous }
    toast.error(`Failed to rename dive computer: ${extractErrorDetail(err)}`)
  }
}
</script>
