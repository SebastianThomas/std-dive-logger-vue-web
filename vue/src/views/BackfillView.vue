<template>
  <div class="min-h-full flex flex-col py-0 px-0 md:mx-10">
    <div
      class="w-full md:max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 space-y-4"
    >
      <h1 class="text-2xl font-bold">
        Backfill
        <span v-if="busy" class="ml-2 text-xs font-normal text-gray-400">
          <LoadingSpinner size="xs" /> working…
        </span>
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Dives missing a newer feature or logged sparsely - fill them in one at a time instead of
        hunting for them yourself. Ordered by most gaps first, then oldest dive first, so nothing
        slips through. If a dive has no more info to add, dismiss it (or a single field) and it
        drops off the list.
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
        <div
          v-if="!active.length"
          class="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-800 dark:text-emerald-300"
        >
          <i class="fa fa-circle-check text-xl" />
          <span>Nothing left in the active queue - everything else is dismissed below.</span>
        </div>

        <template v-if="active.length">
          <!-- Bulk actions -->
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <template v-if="pendingBulk === 'all'">
              <span class="text-gray-600 dark:text-gray-300">
                Dismiss all {{ active.length }} remaining {{ active.length === 1 ? 'dive' : 'dives' }}?
              </span>
              <button
                class="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                :disabled="busy"
                @click="dismissAllRemaining"
              >
                Yes, dismiss all
              </button>
              <button
                class="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="pendingBulk = null"
              >
                Cancel
              </button>
            </template>
            <template v-else-if="pendingBulk === 'category'">
              <span class="text-gray-600 dark:text-gray-300">Dismiss</span>
              <select
                v-model="bulkCategory"
                class="p-1 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option v-for="f in ALL_BACKFILL_FIELDS" :key="f" :value="f">
                  {{ FIELD_LABELS[f] }}
                </option>
              </select>
              <span class="text-gray-600 dark:text-gray-300">on every dive?</span>
              <button
                class="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                :disabled="busy"
                @click="dismissCategoryEverywhere"
              >
                Dismiss everywhere
              </button>
              <button
                class="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="pendingBulk = null"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <button
                class="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="pendingBulk = 'all'"
              >
                Dismiss all remaining
              </button>
              <button
                class="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="pendingBulk = 'category'"
              >
                Dismiss a category everywhere…
              </button>
            </template>
          </div>

          <!-- Next dive to fill in -->
          <div class="rounded-lg border-2 border-sky-300 dark:border-sky-700 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Next up</h2>
              <span class="text-xs text-gray-400 dark:text-gray-500">
                {{ active.length }} {{ active.length === 1 ? 'dive' : 'dives' }} left
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium truncate">
                  #{{ next!.number }}
                  <span v-if="next!.diveIdentifier">- {{ next!.diveIdentifier }}</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ formatDate(next!.diveStart) }} · {{ next!.siteName }}
                </p>
                <div class="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    v-for="field in outstandingFor(next!)"
                    :key="field"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    {{ FIELD_LABELS[field] }}
                    <button
                      type="button"
                      class="opacity-70 hover:opacity-100"
                      title="No info available for this field"
                      :disabled="busy"
                      @click="dismissField(next!.diveId, field)"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </div>
              <div class="shrink-0 flex flex-col items-end gap-1.5">
                <RouterLink
                  :to="{ name: 'DiveEdit', params: { diveId: next!.diveId }, query: { backfill: '1' } }"
                  class="px-4 py-2 rounded bg-sky-600 text-white text-sm hover:bg-sky-700"
                >
                  Fill it in
                </RouterLink>
                <button
                  type="button"
                  class="text-xs text-gray-500 dark:text-gray-400 underline decoration-dotted hover:no-underline"
                  :disabled="busy"
                  @click="dismissDive(next!.diveId)"
                >
                  No more info to add
                </button>
              </div>
            </div>
          </div>

          <!-- Full queue -->
          <div v-if="rest.length" class="space-y-1">
            <h2 class="font-semibold text-sm text-gray-500 dark:text-gray-400">
              Up next after that
            </h2>
            <ul class="divide-y divide-gray-100 dark:divide-gray-700">
              <li
                v-for="status in rest"
                :key="status.diveId"
                class="flex items-center justify-between py-2 gap-3"
              >
                <div class="min-w-0">
                  <RouterLink
                    :to="{
                      name: 'DiveEdit',
                      params: { diveId: status.diveId },
                      query: { backfill: '1' },
                    }"
                    class="text-sm text-blue-600 hover:underline"
                  >
                    #{{ status.number }}
                    <span v-if="status.diveIdentifier">- {{ status.diveIdentifier }}</span>
                  </RouterLink>
                  <div class="flex flex-wrap items-center gap-1 mt-1">
                    <span
                      v-for="field in outstandingFor(status)"
                      :key="field"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
                    >
                      {{ FIELD_LABELS[field] }}
                      <button
                        type="button"
                        class="opacity-70 hover:opacity-100"
                        title="No info available for this field"
                        :disabled="busy"
                        @click="dismissField(status.diveId, field)"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                </div>
                <div class="shrink-0 flex flex-col items-end gap-1 max-w-[45%]">
                  <span class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-full">
                    {{ formatDate(status.diveStart) }} · {{ status.siteName }}
                  </span>
                  <button
                    type="button"
                    class="text-[11px] text-gray-400 dark:text-gray-500 underline decoration-dotted hover:no-underline"
                    :disabled="busy"
                    @click="dismissDive(status.diveId)"
                  >
                    No more info
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </template>

        <!-- Dismissed -->
        <div v-if="dismissedItems.length" class="pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400"
            @click="showDismissed = !showDismissed"
          >
            <i :class="['fa', showDismissed ? 'fa-chevron-down' : 'fa-chevron-right', 'text-xs']" />
            Dismissed — no more info to add ({{ dismissedItems.length }})
          </button>
          <ul v-if="showDismissed" class="divide-y divide-gray-100 dark:divide-gray-700 mt-1">
            <li
              v-for="status in dismissedItems"
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
                <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {{ status.missingFields.map((f) => FIELD_LABELS[f]).join(', ') }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 text-xs text-blue-600 dark:text-blue-400 underline decoration-dotted hover:no-underline"
                :disabled="busy"
                @click="restoreDive(status.diveId)"
              >
                Move back to backfill
              </button>
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
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { formatDate } from '@/lib/utils/timeUtils'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import {
  BACKFILL_FIELD_LABELS as FIELD_LABELS,
  ALL_BACKFILL_FIELDS,
  outstandingBackfillFields,
  isFullyDismissed,
} from '@/lib/dive/backfill'
import { type DiveBackfillMissingField, type DiveBackfillStatus } from '@/lib/types/dive'

const { getWithToken, putWithToken, postWithToken } = useApi()

const queue = ref<DiveBackfillStatus[]>([])
const isLoading = ref(true)
const busy = ref(false)
const showDismissed = ref(false)
const pendingBulk = ref<'all' | 'category' | null>(null)
const bulkCategory = ref<DiveBackfillMissingField>('VISIBILITY')

const active = computed(() => queue.value.filter((s) => !isFullyDismissed(s)))
const dismissedItems = computed(() => queue.value.filter((s) => isFullyDismissed(s)))
const next = computed(() => active.value[0] ?? null)
const rest = computed(() => active.value.slice(1))

const outstandingFor = (status: DiveBackfillStatus) => outstandingBackfillFields(status)

const fetchQueue = async () => {
  isLoading.value = true
  try {
    const res = await getWithToken<DiveBackfillStatus[]>('/v1/dives/backfill')
    queue.value = res.data ?? []
  } catch (err) {
    console.error('Failed to load backfill queue:', err)
    toast.error(`Failed to load the backfill queue: ${extractErrorDetail(err)}`)
  } finally {
    isLoading.value = false
  }
}

/** Replaces one dive's row with the fresh status the mutation endpoint returns. */
const applyStatus = (status: DiveBackfillStatus) => {
  const idx = queue.value.findIndex((s) => s.diveId === status.diveId)
  if (idx >= 0) queue.value[idx] = status
}

const dismissField = async (diveId: number, reason: DiveBackfillMissingField) => {
  busy.value = true
  try {
    const res = await putWithToken<DiveBackfillStatus>(`/v1/dives/${diveId}/backfill/dismissed`, {
      reason,
      dismissed: true,
    })
    applyStatus(res.data)
  } catch (err) {
    toast.error(`Couldn't dismiss that field: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

const dismissDive = async (diveId: number) => {
  busy.value = true
  try {
    const res = await putWithToken<DiveBackfillStatus>(`/v1/dives/${diveId}/backfill/dismissed`, {
      reason: null,
      dismissed: true,
    })
    applyStatus(res.data)
    showDismissed.value = true
  } catch (err) {
    toast.error(`Couldn't dismiss that dive: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

const restoreDive = async (diveId: number) => {
  busy.value = true
  try {
    const res = await putWithToken<DiveBackfillStatus>(`/v1/dives/${diveId}/backfill/dismissed`, {
      reason: null,
      dismissed: false,
    })
    applyStatus(res.data)
  } catch (err) {
    toast.error(`Couldn't restore that dive: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

const dismissAllRemaining = async () => {
  busy.value = true
  try {
    const res = await postWithToken<DiveBackfillStatus[]>('/v1/dives/backfill/dismiss', {
      reason: null,
    })
    queue.value = res.data ?? []
    pendingBulk.value = null
    toast.success('Dismissed all remaining dives.')
  } catch (err) {
    toast.error(`Couldn't dismiss all: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

const dismissCategoryEverywhere = async () => {
  busy.value = true
  try {
    const res = await postWithToken<DiveBackfillStatus[]>('/v1/dives/backfill/dismiss', {
      reason: bulkCategory.value,
    })
    queue.value = res.data ?? []
    pendingBulk.value = null
    toast.success(`Dismissed "${FIELD_LABELS[bulkCategory.value]}" on every dive.`)
  } catch (err) {
    toast.error(`Couldn't dismiss that category: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

onMounted(fetchQueue)
</script>
