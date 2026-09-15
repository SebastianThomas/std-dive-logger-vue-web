<template>
  <section
    v-if="conflicts.length"
    class="rounded-lg border-2 border-amber-300 dark:border-amber-700 p-4 space-y-3"
  >
    <h2 class="font-semibold flex items-center gap-2">
      Changes from re-processing
      <span
        class="inline-flex items-center justify-center min-w-5 px-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      >
        {{ conflicts.length }}
      </span>
    </h2>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      An importer update reads your stored files differently. These would change data your dives
      already have - nothing changes until you apply it. Values that were only missing were filled
      in already.
    </p>
    <ul class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="conflict in conflicts" :key="conflict.id" class="py-2 space-y-1.5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <RouterLink
            :to="{ name: 'DiveView', params: { diveId: conflict.diveId } }"
            class="text-sm font-medium text-blue-600 hover:underline"
          >
            #{{ conflict.diveNumber }}
            <span v-if="conflict.diveIdentifier">- {{ conflict.diveIdentifier }}</span>
          </RouterLink>
          <span class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {{ kindLabel(conflict) }}
          </span>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 break-words">{{ conflict.summary }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-2.5 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700 disabled:opacity-50"
            :disabled="busy"
            @click="resolve(conflict, 'apply')"
          >
            Apply
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            :disabled="busy"
            @click="resolve(conflict, 'keep')"
          >
            Keep current
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { IMPORTED_FIELD_LABELS } from '@/lib/dive/importFiles'
import type { ReprocessConflict } from '@/lib/types/importFiles'

const { getWithToken, postWithToken } = useApi()
const conflicts = ref<ReprocessConflict[]>([])
const busy = ref(false)

const kindLabel = (conflict: ReprocessConflict): string => {
  if (conflict.kind === 'PROFILE' || !conflict.field) return 'Profile'
  const label = IMPORTED_FIELD_LABELS[conflict.field]
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const load = async () => {
  try {
    conflicts.value = (await getWithToken<ReprocessConflict[]>('/v1/reprocess-conflicts')).data ?? []
  } catch (err) {
    console.error('Failed to load re-processing changes:', err)
  }
}

const resolve = async (conflict: ReprocessConflict, action: 'apply' | 'keep') => {
  busy.value = true
  try {
    const res = await postWithToken<ReprocessConflict[]>(
      `/v1/reprocess-conflicts/${conflict.id}/${action}`,
    )
    conflicts.value = res.data ?? []
    toast.success(action === 'apply' ? 'Change applied.' : 'Kept as it is.')
  } catch (err) {
    // A stale proposal is refused and dropped - reload so it disappears.
    toast.error(extractErrorDetail(err))
    await load()
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>
