<template>
  <div class="min-h-full flex flex-col py-0 px-0 md:mx-10">
    <div
      class="w-full md:max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 space-y-4"
    >
      <h1 class="text-2xl font-bold">Backfill</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Dives that are missing a newer feature or were logged sparsely - fill them in one at a
        time instead of hunting for them yourself.
      </p>

      <!-- Loading -->
      <div v-if="isLoading" class="text-gray-500">Loading…</div>

      <!-- All caught up -->
      <div
        v-else-if="!queue.length"
        class="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-800 dark:text-emerald-300"
      >
        <i class="fa fa-circle-check text-xl" />
        <span>All your dives are fully filled in. Nothing to backfill right now.</span>
      </div>

      <template v-else>
        <!-- Next dive to fill in -->
        <div class="rounded-lg border-2 border-sky-300 dark:border-sky-700 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Next up</h2>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ queue.length }} {{ queue.length === 1 ? 'dive' : 'dives' }} left
            </span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium truncate">
                #{{ next!.number }}
                <span v-if="next!.diveIdentifier">- {{ next!.diveIdentifier }}</span>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(next!.diveStart) }}
              </p>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span
                  v-for="field in next!.missingFields"
                  :key="field"
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  {{ FIELD_LABELS[field] }}
                </span>
              </div>
            </div>
            <RouterLink
              :to="{ name: 'DiveEdit', params: { diveId: next!.diveId } }"
              class="shrink-0 px-4 py-2 rounded bg-sky-600 text-white text-sm hover:bg-sky-700"
            >
              Fill it in
            </RouterLink>
          </div>
        </div>

        <!-- Full queue -->
        <div v-if="rest.length" class="space-y-1">
          <h2 class="font-semibold text-sm text-gray-500 dark:text-gray-400">Up next after that</h2>
          <ul class="divide-y divide-gray-100 dark:divide-gray-700">
            <li
              v-for="status in rest"
              :key="status.diveId"
              class="flex items-center justify-between py-2 gap-3"
            >
              <div class="min-w-0">
                <RouterLink
                  :to="{ name: 'DiveEdit', params: { diveId: status.diveId } }"
                  class="text-sm text-blue-600 hover:underline"
                >
                  #{{ status.number }}
                  <span v-if="status.diveIdentifier">- {{ status.diveIdentifier }}</span>
                </RouterLink>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="field in status.missingFields"
                    :key="field"
                    class="inline-block px-1.5 py-0.5 rounded text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
                  >
                    {{ FIELD_LABELS[field] }}
                  </span>
                </div>
              </div>
              <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                {{ formatDate(status.diveStart) }}
              </span>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { formatDate } from '@/lib/utils/timeUtils'
import type { DiveBackfillMissingField, DiveBackfillStatus } from '@/lib/types/dive'

const FIELD_LABELS: Record<DiveBackfillMissingField, string> = {
  VISIBILITY: 'Visibility',
  GAS_CONSUMPTION: 'Gas Consumption',
  WATER_TYPE: 'Water Type & Current',
  LEADER: 'Dive Leader',
  NOTES: 'Notes',
}

const { getWithToken } = useApi()

const queue = ref<DiveBackfillStatus[]>([])
const isLoading = ref(true)

const next = computed(() => queue.value[0] ?? null)
const rest = computed(() => queue.value.slice(1))

const fetchQueue = async () => {
  isLoading.value = true
  try {
    const res = await getWithToken<DiveBackfillStatus[]>('/v1/dives/backfill')
    queue.value = res.data ?? []
  } catch (err) {
    console.error('Failed to load backfill queue:', err)
    toast.error('Failed to load the backfill queue.')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchQueue)
</script>
