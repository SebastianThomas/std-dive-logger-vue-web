<template>
  <div class="flex flex-col gap-6">
    <section v-if="ownEntries.length">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">Your dives ({{ ownEntries.length }})</h3>
        <button
          type="button"
          class="text-xs text-sky-600 hover:text-sky-700"
          @click="toggleAll(ownEntries)"
        >
          {{ allSelected(ownEntries) ? 'Deselect all' : 'Select all' }}
        </button>
      </div>
      <ul class="space-y-1 max-h-64 overflow-auto">
        <li
          v-for="entry in ownEntries"
          :key="entry.id"
          class="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm"
        >
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="selected" :value="entry.id" />
            <span>{{ entry.label }}</span>
          </label>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ entry.dateLabel }}</span>
        </li>
      </ul>
    </section>

    <section v-if="sharedEntries.length">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">Shared with you ({{ sharedEntries.length }})</h3>
        <button
          type="button"
          class="text-xs text-sky-600 hover:text-sky-700"
          @click="toggleAll(sharedEntries)"
        >
          {{ allSelected(sharedEntries) ? 'Deselect all' : 'Select all' }}
        </button>
      </div>
      <ul class="space-y-1 max-h-64 overflow-auto">
        <li
          v-for="entry in sharedEntries"
          :key="entry.id"
          class="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm"
        >
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="selected" :value="entry.id" />
            <span>{{ entry.label }}</span>
          </label>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ entry.dateLabel }}</span>
        </li>
      </ul>
    </section>

    <p v-if="!ownEntries.length && !sharedEntries.length" class="text-sm text-gray-400">
      No dives found in this wetnotes.com account.
    </p>

    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="selected.length === 0"
        class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="stageSelected"
      >
        Stage {{ selected.length }} selected
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatDate } from '@/lib/utils/timeUtils'
import type { DivesoftDiveJson } from '@/lib/divesoft'

export type DivesoftDiveListItem = {
  id: string
  json: DivesoftDiveJson
  isShared: boolean
}

const props = defineProps<{
  dives: DivesoftDiveListItem[]
}>()

const emit = defineEmits<{
  stage: [selected: DivesoftDiveJson[]]
  cancel: []
}>()

/** Pulls the fields needed for display straight out of the raw, untyped Divesoft JSON - the same
 * `diveAndMixes.dive` shape the backend's DivesoftDiveDetailResponse expects, just read
 * defensively here since this is plain JSON on the frontend rather than a typed DTO. */
const extractDiveInfo = (
  json: DivesoftDiveJson,
): { startDate?: string; site?: string; description?: string } => {
  const diveAndMixes = json.diveAndMixes as Record<string, unknown> | undefined
  const dive = diveAndMixes?.dive as Record<string, unknown> | undefined
  return {
    startDate: typeof dive?.startDate === 'string' ? dive.startDate : undefined,
    site: typeof dive?.site === 'string' ? dive.site : undefined,
    description: typeof dive?.description === 'string' ? dive.description : undefined,
  }
}

type Entry = {
  id: string
  label: string
  dateLabel: string
  sortKey: number
}

const toEntry = (item: DivesoftDiveListItem): Entry => {
  const info = extractDiveInfo(item.json)
  const parsed = info.startDate ? new Date(info.startDate) : null
  const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
  return {
    id: item.id,
    label: info.site || info.description || `Dive ${item.id}`,
    dateLabel: validDate ? formatDate(validDate) : 'Unknown date',
    // Undated dives sort last rather than first, so a parsing miss doesn't bury real dates.
    sortKey: validDate ? validDate.getTime() : -Infinity,
  }
}

const sortDescending = (entries: Entry[]): Entry[] =>
  [...entries].sort((a, b) => b.sortKey - a.sortKey)

const ownEntries = computed(() =>
  sortDescending(props.dives.filter((d) => !d.isShared).map(toEntry)),
)
const sharedEntries = computed(() =>
  sortDescending(props.dives.filter((d) => d.isShared).map(toEntry)),
)

const selected = ref<string[]>([])

const allSelected = (entries: Entry[]): boolean =>
  entries.length > 0 && entries.every((e) => selected.value.includes(e.id))

const toggleAll = (entries: Entry[]) => {
  const ids = entries.map((e) => e.id)
  if (allSelected(entries)) {
    selected.value = selected.value.filter((id) => !ids.includes(id))
  } else {
    selected.value = Array.from(new Set([...selected.value, ...ids]))
  }
}

const stageSelected = () => {
  const selectedSet = new Set(selected.value)
  const jsons = props.dives.filter((d) => selectedSet.has(d.id)).map((d) => d.json)
  emit('stage', jsons)
}
</script>
