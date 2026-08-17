<template>
  <div class="overflow-auto border rounded-lg">
    <table class="w-full border-collapse overflow-scroll">
      <thead>
        <tr class="bg-blue-200">
          <th class="border border-gray-400 px-2 py-2 text-left w-12">
            <StyledCheckbox
              :model-value="selectedIds.length === dives.length && dives.length > 0"
              @update:model-value="$emit('toggle-all')"
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
          <th class="border border-gray-400 px-3 py-2 text-left min-w-32">Tags</th>
        </tr>
      </thead>
      <tbody class="bg-white">
        <tr
          v-for="dive in dives"
          :key="dive.id"
          :class="[
            'cursor-pointer transition-colors border-l-4',
            selectedIds.includes(dive.id)
              ? 'bg-sky-100 hover:bg-sky-200 dark:bg-sky-900 dark:hover:bg-sky-800 border-l-sky-500 dark:border-l-sky-400'
              : dive.user.id !== myUserId
                ? 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-l-transparent'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-transparent',
          ]"
          @click="$emit('row-click', dive.id)"
        >
          <td class="border border-gray-400 px-2 py-2 text-center" @click.stop>
            <StyledCheckbox
              :model-value="selectedIds.includes(dive.id)"
              @update:model-value="$emit('toggle-row', dive.id)"
            />
          </td>
          <td class="border border-gray-400 px-3 py-2 w-16" @click.stop>
            <a
              :href="diveHref(dive.id)"
              class="block hover:underline hover:text-blue-700 dark:hover:text-blue-400"
              @click="handleLinkClick($event, dive.id)"
              >{{ dive.number }}</a
            >
          </td>
          <td class="border border-gray-400 px-3 py-2 max-w-lg wrap-break-word" @click.stop>
            <a
              :href="diveHref(dive.id)"
              class="block hover:underline hover:text-blue-700 dark:hover:text-blue-400"
              @click="handleLinkClick($event, dive.id)"
              >{{ dive.customIdentifier || '-' }}</a
            >
          </td>
          <td class="border border-gray-400 px-3 py-2 w-40">
            {{ formatDate(dive.summary.start) }}
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
          <td class="border border-gray-400 px-3 py-2 min-w-32">
            <div class="flex flex-wrap gap-1">
              <TagBadge
                v-for="tag in dive.tags ?? []"
                :key="tag.id"
                :name="tag.name"
                :auto-detected="!!tag.autoDetectRule"
              />
            </div>
          </td>
        </tr>
        <tr v-if="!dives.length && !isLoading">
          <td colspan="10" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
            {{ status || 'No dives found' }}
          </td>
        </tr>
        <tr v-if="isLoading">
          <td colspan="10" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
            Loading...
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import DiveSitePreview from '@/components/DiveSitePreview.vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'
import type { DiveWithoutProfiles } from '@/lib/types/dive'
import TagBadge from '@/components/dive/TagBadge.vue'
import type { SortDirection, SortColumn } from '@/lib/types/sort'
import { formatISoDurationToTime, formatDate } from '@/lib/utils/timeUtils'

const router = useRouter()

// A real resolved href, not just an SPA click handler - lets ctrl/cmd+click (or middle-click)
// open the dive in a new tab, which a plain @click-only row never supported.
const diveHref = (diveId: number) => router.resolve({ name: 'DiveView', params: { diveId } }).href

// Mirrors vue-router's own RouterLink click guard: a modified click (ctrl/cmd/shift/alt) or
// anything but a plain left click is left entirely to the browser's native "open in new
// tab"/"open in new window" handling - only a plain click is intercepted to emit row-click (which
// respects selection mode, unlike a bare navigation would).
const handleLinkClick = (event: MouseEvent, diveId: number) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  event.preventDefault()
  emit('row-click', diveId)
}

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
