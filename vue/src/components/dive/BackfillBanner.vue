<template>
  <div
    v-if="fullyDismissed"
    class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-2"
  >
    <span class="text-gray-600 dark:text-gray-300">
      <i class="fa fa-circle-check mr-1.5 text-emerald-600 dark:text-emerald-400" />
      Marked <strong>no more info to add</strong> — this dive is out of the backfill queue.
    </span>
    <button
      type="button"
      class="underline decoration-dotted hover:no-underline text-blue-600 dark:text-blue-400"
      @click="$emit('restore')"
    >
      Move back to backfill
    </button>
  </div>

  <div
    v-else-if="outstanding.length"
    :class="[
      'rounded-lg px-4 py-3 text-sm',
      prominent
        ? 'border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40'
        : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60',
    ]"
  >
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <i
        :class="[
          'fa',
          prominent ? 'fa-flag text-amber-600 dark:text-amber-400' : 'fa-circle-info text-gray-400',
        ]"
      />
      <span :class="prominent ? 'font-medium text-amber-900 dark:text-amber-100' : 'text-gray-600 dark:text-gray-300'">
        <template v-if="prominent">
          Backfilling this dive — {{ outstanding.length }}
          {{ outstanding.length === 1 ? 'field is' : 'fields are' }} flagged as missing.
        </template>
        <template v-else>
          {{ outstanding.length }} optional
          {{ outstanding.length === 1 ? 'field looks' : 'fields look' }} empty — fill in what you
          know.
        </template>
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mt-2">
      <span class="text-xs text-gray-500 dark:text-gray-400 mr-1">Jump to:</span>
      <button
        v-for="field in outstanding"
        :key="field"
        type="button"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
        @click="$emit('jump', field)"
      >
        {{ labels[field] }}
      </button>
    </div>

    <p v-if="prominent" class="text-xs text-amber-800/80 dark:text-amber-200/70 mt-2">
      No more info to add for some of these? Use <strong>Save &amp; dismiss (no more info)</strong>
      below, or the “no info” link next to a field.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { DiveBackfillMissingField } from '@/lib/types/dive'
import { BACKFILL_FIELD_LABELS } from '@/lib/dive/backfill'

defineProps<{
  /** Missing and not dismissed - the chips shown. */
  outstanding: DiveBackfillMissingField[]
  /** True when the dive has gaps but every one is dismissed. */
  fullyDismissed: boolean
  /** Prominent amber styling when the user arrived from the Backfill guide. */
  prominent?: boolean
}>()

defineEmits<{
  jump: [field: DiveBackfillMissingField]
  restore: []
}>()

const labels = BACKFILL_FIELD_LABELS
</script>
