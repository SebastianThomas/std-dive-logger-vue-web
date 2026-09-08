<template>
  <RouterLink
    :to="{ name: 'DiveView', params: { diveId } }"
    class="flex items-baseline gap-x-2 py-1.5 hover:text-blue-600"
  >
    <span class="font-semibold shrink-0">#{{ number }}</span>
    <span
      v-if="badge"
      class="shrink-0 rounded px-1 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide"
      :class="badgeClass"
    >
      {{ badge }}
    </span>
    <span class="truncate min-w-0">{{ identifier || siteName || 'Dive' }}</span>
    <span class="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
      <span v-if="date">{{ date }}</span>
      <template v-if="emphasize">
        <span class="font-semibold text-gray-700 dark:text-gray-200">
          <span v-if="date"> · </span>{{ recordValue }}
        </span>
      </template>
      <template v-else>
        <span v-if="maxDepth != null"
          ><span v-if="date"> · </span>{{ maxDepth.toFixed(0) }} m</span
        >
        <span v-if="bottomTime"> · {{ formatDurationToTime(bottomTime) }}</span>
      </template>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDurationToTime } from '@/lib/utils/timeUtils'

const props = defineProps<{
  diveId: number
  number: number
  identifier?: string | null
  siteName?: string | null
  start?: number | null
  zoneId?: string | null
  maxDepth?: number | null
  bottomTime?: number | null
  badge?: string
  emphasize?: 'depth' | 'time'
}>()

// Date only (no time-of-day) - keeps each row to a single line on mobile. Site-local when known.
const date = computed(() =>
  props.start == null
    ? ''
    : new Date(props.start).toLocaleDateString('de-DE', {
        timeZone: props.zoneId ?? 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }),
)

// In "records" mode only the single record metric is shown next to the date, so the row stays a
// one-liner even with the badge eating horizontal space.
const recordValue = computed(() =>
  props.emphasize === 'depth'
    ? `${props.maxDepth?.toFixed(1) ?? '—'} m`
    : formatDurationToTime(props.bottomTime),
)

const badgeClass = computed(() =>
  props.emphasize === 'depth'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
    : props.emphasize === 'time'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
)
</script>
