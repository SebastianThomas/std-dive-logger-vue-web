<template>
  <div>
    <button
      v-if="!expanded"
      type="button"
      class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
      @click="expanded = true"
    >
      Don't have a dive computer file? Log manually &rarr;
    </button>

    <div
      v-else
      class="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-sm">Log a dive manually</h2>
        <button
          type="button"
          class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          @click="expanded = false"
        >
          Cancel
        </button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        No real profile is recorded for a manually-logged dive - only a max depth and duration. Use
        this only when you don't have a dive computer file to import.
      </p>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Dive Site</label>
        <DiveSiteSearch
          placeholder="Search by name..."
          @selected="onSiteSelected"
          @update:search-term="(value) => (typedSiteName = value)"
        />
        <button
          type="button"
          class="self-start text-xs text-blue-600 hover:underline"
          @click="showSiteSelector = true"
        >
          Can't find it? Create a new dive site →
        </button>
        <p v-if="selectedSite" class="text-sm text-emerald-700 dark:text-emerald-400">
          Selected: {{ selectedSite.name }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="manual-dive-identifier" class="text-sm font-medium">Dive Name / Identifier</label>
        <input
          id="manual-dive-identifier"
          v-model="diveIdentifier"
          type="text"
          class="p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="manual-dive-start" class="text-sm font-medium">Start Date & Time</label>
        <input
          id="manual-dive-start"
          v-model="startTimeLocal"
          type="datetime-local"
          class="p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="manual-dive-max-depth" class="text-sm font-medium">Max Depth (m)</label>
          <input
            id="manual-dive-max-depth"
            v-model.number="maxDepth"
            type="number"
            min="0"
            step="0.1"
            class="p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="manual-dive-duration" class="text-sm font-medium">Duration (min)</label>
          <input
            id="manual-dive-duration"
            v-model.number="durationMinutes"
            type="number"
            min="1"
            step="1"
            class="p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-1">
        <button
          type="button"
          :disabled="submitting"
          class="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 disabled:opacity-50"
          @click="expanded = false"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="!canSubmit || submitting"
          class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="submit"
        >
          {{ submitting ? 'Saving...' : 'Save Manual Dive' }}
        </button>
      </div>
    </div>

    <DiveSiteSelector
      v-if="showSiteSelector"
      :initial-name="typedSiteName"
      @site-selected="onSiteChosenFromSelector"
      @site-created="onSiteChosenFromSelector"
      @close="showSiteSelector = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import DiveSiteSearch from '@/components/DiveSiteSearch.vue'
import DiveSiteSelector from '@/components/DiveSiteSelector.vue'
import type { Dive, DiveSite } from '@/lib/types/dive'

const emit = defineEmits<{
  created: [dive: Dive]
}>()

const { postWithToken } = useApi()

const expanded = ref(false)
const submitting = ref(false)

const selectedSite = ref<DiveSite | null>(null)
const showSiteSelector = ref(false)
/** Mirrors whatever the diver has typed into the search box above, so opening the "create new
 * site" fallback (see the "Can't find it?" link below) starts pre-filled with it instead of
 * making them retype the name they already entered. */
const typedSiteName = ref('')
const diveIdentifier = ref('')
const startTimeLocal = ref('')
const maxDepth = ref<number | null>(null)
const durationMinutes = ref<number | null>(null)

const onSiteSelected = (site: DiveSite) => {
  selectedSite.value = site
}

const onSiteChosenFromSelector = (site: DiveSite) => {
  selectedSite.value = site
  showSiteSelector.value = false
}

const canSubmit = computed(
  () =>
    !!selectedSite.value &&
    diveIdentifier.value.trim().length > 0 &&
    !!maxDepth.value &&
    maxDepth.value > 0 &&
    !!durationMinutes.value &&
    durationMinutes.value > 0,
)

const submit = async () => {
  if (!canSubmit.value || !selectedSite.value) return
  submitting.value = true
  try {
    const body = {
      diveIdentifier: diveIdentifier.value.trim(),
      diveSiteId: selectedSite.value.id,
      maxDepth: maxDepth.value,
      duration: `PT${durationMinutes.value}M`,
      startTime: startTimeLocal.value ? new Date(startTimeLocal.value).toISOString() : undefined,
    }
    const res = await postWithToken<Dive, typeof body>('/v1/dives/create', body)
    toast.success('Manual dive saved')
    emit('created', res.data)
  } catch (err) {
    console.error('Failed to save manual dive:', err)
    toast.error(`Failed to save manual dive: ${extractErrorDetail(err)}`)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped></style>
