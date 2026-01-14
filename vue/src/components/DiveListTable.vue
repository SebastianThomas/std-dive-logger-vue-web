<template>
  <div class="overflow-auto border rounded-lg">
    <table class="w-full border-collapse overflow-scroll">
      <thead>
        <tr class="bg-blue-200">
          <th class="border border-gray-400 px-2 py-2 text-left w-12">
            <input
              type="checkbox"
              :checked="selectedIds.length === dives.length && dives.length > 0"
              @change="$emit('toggle-all')"
              class="cursor-pointer"
            />
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[
              'border border-gray-400 px-3 py-2 text-left',
              col.width,
              col.sortable && !searchQuery.trim() ? 'cursor-pointer hover:bg-blue-300' : '',
              !col.sortable || searchQuery.trim() ? 'cursor-default opacity-60' : '',
            ]"
            @click="col.sortable ? $emit('sort', col.serverCol) : null"
          >
            <div class="flex items-center gap-2">
              {{ col.label }}
              <span
                v-if="col.sortable && sortColumn === col.serverCol && !searchQuery.trim()"
                class="text-xs"
              >
                {{ sortDirection === 'ASCENDING' ? '▲' : '▼' }}
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white">
        <tr
          v-for="dive in dives"
          :key="dive.id"
          :class="[
            'cursor-pointer transition-colors',
            selectedIds.includes(dive.id)
              ? 'bg-sky-100 hover:bg-sky-200 dark:bg-sky-900 dark:hover:bg-sky-800 border-l-4 border-l-sky-500 dark:border-l-sky-400'
              : dive.user.id !== myUserId
                ? 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800',
          ]"
          @click="$emit('row-click', dive.id)"
        >
          <td class="border border-gray-400 px-2 py-2 text-center" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.includes(dive.id)"
              @click.stop
              @change="$emit('toggle-row', dive.id)"
              class="cursor-pointer"
            />
          </td>
          <td class="border border-gray-400 px-3 py-2 w-16">{{ dive.number }}</td>
          <td class="border border-gray-400 px-3 py-2 max-w-lg wrap-break-word">
            {{ dive.customIdentifier || '-' }}
          </td>
          <td class="border border-gray-400 px-3 py-2 w-40">
            {{
              new Date(dive.summary.start).toLocaleString('de-DE', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            }}
          </td>
          <td class="border border-gray-400 px-3 py-2 w-24">
            {{ dive.summary.maxDepth.toFixed(1) }} m
          </td>
          <td class="border border-gray-400 px-3 py-2 w-28">
            {{ formatISoDurationToTime(dive.summary.bottomTime) }}
          </td>
          <td class="border border-gray-400 px-3 py-2 min-w-48">
            {{ dive.site?.name || 'Unknown' }}
          </td>
          <td class="border border-gray-400 px-1 py-1 w-24 flex justify-center">
            <DiveSitePreview :dive="dive" @preview-regenerated="handlePreviewRegenerated" />
          </td>
          <td class="border border-gray-400 px-3 py-2 w-32">
            {{ dive.user.id === myUserId ? 'You' : dive.user?.name || 'Unknown' }}
          </td>
        </tr>
        <tr v-if="!dives.length && !isLoading">
          <td colspan="9" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
            {{ status || 'No dives found' }}
          </td>
        </tr>
        <tr v-if="isLoading">
          <td colspan="9" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
            Loading...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import DiveSitePreview from '@/components/DiveSitePreview.vue'
import type { DiveWithoutProfiles } from '@/lib/types/dive'
import type { SortDirection, SortColumn } from '@/lib/types/sort'
import { formatISoDurationToTime } from '@/lib/utils/timeUtils'

interface ColumnDef {
  key: keyof DiveWithoutProfiles
  label: string
  serverCol: SortColumn | null
  sortable: boolean
  width?: string
}

defineProps<{
  dives: DiveWithoutProfiles[]
  selectedIds: number[]
  myUserId: number | null
  isLoading: boolean
  status: string
  searchQuery: string
  sortColumn: SortColumn
  sortDirection: SortDirection
  columns: ColumnDef[]
}>()

const emit = defineEmits<{
  'toggle-all': []
  'toggle-row': [diveId: number]
  'row-click': [diveId: number]
  sort: [serverCol: SortColumn | null]
  'preview-regenerated': [dive: DiveWithoutProfiles]
}>()

const handlePreviewRegenerated = (dive: DiveWithoutProfiles) => {
  emit('preview-regenerated', dive)
}
</script>

<style scoped></style>
