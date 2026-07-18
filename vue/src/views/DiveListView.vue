<template>
  <div class="min-h-full flex flex-col py-0 px-0 md:mx-10">
    <div
      class="w-full md:max-w-7xl bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 space-y-4"
    >
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold">Dive List</h1>
          <span
            v-if="!isLoading && totalElements > 0"
            class="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm border border-gray-200 dark:border-gray-600"
          >
            {{ totalElements }} {{ totalElements === 1 ? 'dive' : 'dives' }}
          </span>
          <span
            v-if="isSelectionMode"
            class="px-2 py-1 rounded-full bg-sky-100 text-sky-800 text-sm border border-sky-300"
          >
            {{ selectedIds.length }} selected
          </span>
        </div>
        <div v-if="isSelectionMode" class="flex gap-2">
          <button
            @click="openBulkActions"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bulk Actions
          </button>
          <button
            @click="clearSelection"
            class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            Clear Selection
          </button>
        </div>
      </div>

      <!-- Date & Time filters -->
      <div class="border rounded-lg border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300"
          @click="showDateTimeFilters = !showDateTimeFilters"
        >
          <span class="flex items-center gap-2">
            Date &amp; Time Filters
            <span
              v-if="hasDateTimeFilter"
              class="w-2 h-2 rounded-full bg-blue-500"
              title="A date or time filter is active"
            />
          </span>
          <span class="flex items-center gap-3">
            <span
              v-if="hasDateTimeFilter || diveSiteId || baseConfiguration"
              class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
              @click.stop="clearTimelineFilters"
            >
              Reset
            </span>
            <i :class="showDateTimeFilters ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </span>
        </button>
        <div
          v-show="showDateTimeFilters"
          class="px-3 pb-3 pt-3 space-y-3 border-t border-gray-100 dark:border-gray-700"
        >
          <!-- Date range -->
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0"
                >Date range:</span
              >
              <input
                v-model="startDateInput"
                type="date"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-900 dark:text-white"
              />
              <span class="text-gray-400">–</span>
              <input
                v-model="endDateInput"
                type="date"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-900 dark:text-white"
              />
              <button
                v-if="startDate || endDate"
                type="button"
                class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                @click="clearDateRange"
              >
                Clear
              </button>
            </div>
            <div v-if="availableYears.length" class="flex flex-wrap gap-1.5">
              <button
                v-for="year in availableYears"
                :key="year"
                type="button"
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                  selectedYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-blue-400',
                ]"
                @click="selectYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </div>

          <!-- Time of day -->
          <div class="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0"
                >Time of day:</span
              >
              <input
                v-model="startTimeOfDayInput"
                type="time"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-900 dark:text-white"
              />
              <span class="text-gray-400">–</span>
              <input
                v-model="endTimeOfDayInput"
                type="time"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-900 dark:text-white"
              />
              <button
                v-if="startTimeOfDay || endTimeOfDay"
                type="button"
                class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                @click="clearTimeOfDay"
              >
                Clear
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in timePresets"
                :key="preset.label"
                type="button"
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                  startTimeOfDay === preset.start && endTimeOfDay === preset.end
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-blue-400',
                ]"
                @click="applyTimePreset(preset.start, preset.end)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tag filter panel -->
      <div v-if="availableTags.length" class="space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
            Filter by tag:
          </span>
          <button
            v-for="tag in availableTags"
            :key="tag.id"
            type="button"
            :class="[
              'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
              selectedTagIds.has(tag.id)
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
            ]"
            @click="toggleTagFilter(tag.id)"
          >
            {{ tag.name }}
          </button>
          <button
            v-if="selectedTagIds.size"
            @click="clearTagFilter"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline ml-1"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search dives..."
            autofocus
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
            @input="handleSearch"
            @keydown.esc="handleSearchEscape"
          />
        </div>
        <button
          @click="toggleSharedDives"
          :class="[
            'px-4 py-2 rounded-md border text-sm font-medium transition',
            viewShared
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          {{ viewShared ? 'Viewing shared dives' : 'View shared dives' }}
        </button>
      </div>

      <!-- Mobile Pagination (top) -->
      <PageSelector
        class="sm:hidden"
        :current-page="currentPage"
        :total-pages="totalPages"
        :page-size="pageSize"
        @update:page="goToPage"
      />

      <!-- Table -->
      <DiveListTable
        :dives="dives"
        :selected-ids="selectedIds"
        :my-user-id="myUserId"
        :is-loading="isLoading"
        :status="status"
        :search-query="searchQuery"
        :sort-column="sortColumn"
        :sort-direction="sortDirection"
        :columns="columns"
        @toggle-all="toggleAll"
        @toggle-row="toggleRow"
        @row-click="onRowClick"
        @sort="sortBy"
        @preview-regenerated="handlePreviewRegenerated"
      />

      <!-- Pagination -->
      <PageSelector
        :current-page="currentPage"
        :total-pages="totalPages"
        :page-size="pageSize"
        @update:page="goToPage"
      />
    </div>

    <!-- Bulk Actions Modal -->
    <BulkActionsModal
      :open="showBulkActions"
      :selected-dives="selectedDivesData"
      @close="showBulkActions = false"
      @refresh="handleBulkActionComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '../composables/useApi'
import BulkActionsModal from '@/components/dive/BulkActionsModal.vue'
import DiveListTable from '@/components/DiveListTable.vue'
import PageSelector from '@/components/PageSelector.vue'
import type {
  DiveWithoutProfiles,
  PagedResult,
  TagDefinition,
  BaseConfiguration,
} from '../lib/types/dive'
import type { UserDiveStatsByYear } from '@/lib/types/stats'
import debounce from '../lib/utils/debounce'
import type { SortDirection, SortColumn } from '@/lib/types/sort'

const router = useRouter()
const route = useRoute()
const { getWithToken } = useApi()

// State
const dives = ref<DiveWithoutProfiles[]>([])
const status = ref('')
const isLoading = ref(false)
const myUserId = ref<number | null>(null)

// Initialize state from URL query params
const currentPage = ref(Number(route.query.page) || 1)
const totalPages = ref(0)
const totalElements = ref(0)
const pageSize = ref(20)

const searchQuery = ref((route.query.search as string) || '')
const viewShared = ref(route.query.shared === 'true')
const searchInputRef = ref<HTMLInputElement | null>(null)
const computerId = ref(route.query.computerId ? Number(route.query.computerId) : null)
const suitId = ref(route.query.suitId ? Number(route.query.suitId) : null)

// Set either by manually picking a date range / time-of-day range below, or by arriving from the
// "view dives in this time range" link on the stats timeline — either way, combines with whatever
// other filters (tags/suit/site/base config/search) are also active.
const startDate = ref<string | null>((route.query.startDate as string) || null)
const endDate = ref<string | null>((route.query.endDate as string) || null)
const startTimeOfDay = ref<string | null>((route.query.startTime as string) || null)
const endTimeOfDay = ref<string | null>((route.query.endTime as string) || null)
const diveSiteId = ref(route.query.diveSiteId ? Number(route.query.diveSiteId) : null)
const baseConfiguration = ref<BaseConfiguration | null>(
  (route.query.baseConfiguration as BaseConfiguration) || null,
)
const hasDateTimeFilter = computed(
  () => !!(startDate.value && endDate.value) || !!(startTimeOfDay.value && endTimeOfDay.value),
)
const showDateTimeFilters = ref(hasDateTimeFilter.value)

// <input type="date"> needs plain "YYYY-MM-DD"; endDate is stored exclusive (matches the
// stats-timeline click-through semantics), so picking "28 Feb" as the end date in the UI must
// store "1 Mar 00:00" to include all of the 28th. Both sides only ever land on UTC-midnight
// boundaries, so the +/-1 day adjustment round-trips cleanly either way.
const startDateInput = computed({
  get: () => (startDate.value ? startDate.value.slice(0, 10) : ''),
  set: (value: string) => {
    startDate.value = value ? `${value}T00:00:00.000Z` : null
  },
})
const endDateInput = computed({
  get: () => {
    if (!endDate.value) return ''
    const d = new Date(endDate.value)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  },
  set: (value: string) => {
    if (!value) {
      endDate.value = null
      return
    }
    const d = new Date(`${value}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    endDate.value = d.toISOString()
  },
})

// <input type="time"> can't bind directly to a possibly-null ref (DOM would render the literal
// text "null"), so coerce null <-> '' at the edges.
const startTimeOfDayInput = computed({
  get: () => startTimeOfDay.value ?? '',
  set: (value: string) => {
    startTimeOfDay.value = value || null
  },
})
const endTimeOfDayInput = computed({
  get: () => endTimeOfDay.value ?? '',
  set: (value: string) => {
    endTimeOfDay.value = value || null
  },
})

// Years the user actually has dives in, most recent first — sourced from the same aggregate the
// overview stats page uses, so there's no separate "earliest dive" lookup or guessed fallback.
const availableYears = ref<number[]>([])
const fetchAvailableYears = async () => {
  try {
    const res = await getWithToken<UserDiveStatsByYear>('/v1/stats/year')
    availableYears.value = Object.keys(res.data ?? {})
      .map(Number)
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a)
  } catch (err) {
    console.error('Failed to fetch dive years', err)
  }
}

const selectedYear = computed<number | null>(() => {
  if (!startDate.value || !endDate.value) return null
  const s = new Date(startDate.value)
  const e = new Date(endDate.value)
  const isYearStart = s.getUTCMonth() === 0 && s.getUTCDate() === 1
  const isNextYearStart =
    e.getUTCMonth() === 0 && e.getUTCDate() === 1 && e.getUTCFullYear() === s.getUTCFullYear() + 1
  return isYearStart && isNextYearStart ? s.getUTCFullYear() : null
})

const selectYear = (year: number) => {
  startDate.value = `${year}-01-01T00:00:00.000Z`
  endDate.value = `${year + 1}-01-01T00:00:00.000Z`
  currentPage.value = 1
}

const clearDateRange = () => {
  startDate.value = null
  endDate.value = null
  currentPage.value = 1
}

const timePresets: { label: string; start: string; end: string }[] = [
  { label: 'Morning', start: '06:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '18:00' },
  { label: 'Evening', start: '18:00', end: '22:00' },
  { label: 'Night', start: '22:00', end: '06:00' },
]

const applyTimePreset = (start: string, end: string) => {
  startTimeOfDay.value = start
  endTimeOfDay.value = end
  currentPage.value = 1
}

const clearTimeOfDay = () => {
  startTimeOfDay.value = null
  endTimeOfDay.value = null
  currentPage.value = 1
}

// Multi-tag filter: initialise from URL (supports legacy single ?tagId= and new ?tagIds=1&tagIds=2)
const availableTags = ref<TagDefinition[]>([])
const initTagIds = (): Set<number> => {
  const single = route.query.tagId ? Number(route.query.tagId) : null
  const multi = Array.isArray(route.query.tagIds)
    ? (route.query.tagIds as string[]).map(Number)
    : route.query.tagIds
      ? [Number(route.query.tagIds)]
      : []
  const ids = multi.length ? multi : single ? [single] : []
  return new Set(ids.filter((n) => !isNaN(n) && n > 0))
}
const selectedTagIds = ref<Set<number>>(initTagIds())

const sortColumn = ref<SortColumn>((route.query.sortCol as SortColumn) || 'NUMBER')
const sortDirection = ref<SortDirection>((route.query.sortDir as SortDirection) || 'DESCENDING')

// Column definitions with server mapping
const columns: {
  key: keyof DiveWithoutProfiles
  label: string
  serverCol: SortColumn | null
  sortable: boolean
  width?: string
}[] = [
  { key: 'number', label: '#', serverCol: 'NUMBER', sortable: true, width: 'w-16' },
  {
    key: 'customIdentifier',
    label: 'Custom Name',
    serverCol: 'CUSTOM_IDENTIFIER',
    sortable: true,
  },
  { key: 'summary', label: 'Start Time', serverCol: null, sortable: false, width: 'w-40' },
  { key: 'summary', label: 'Max Depth', serverCol: null, sortable: false, width: 'w-24' },
  { key: 'summary', label: 'Bottom Time', serverCol: null, sortable: false, width: 'w-28' },
  { key: 'site', label: 'Site', serverCol: null, sortable: false },
  { key: 'site', label: 'Profile', serverCol: null, sortable: false, width: 'w-24' },
  { key: 'user', label: 'Diver', serverCol: null, sortable: false, width: 'w-32' },
]

// Functions
const fetchAvailableTags = async () => {
  try {
    const res = await getWithToken<TagDefinition[]>('/v1/tags')
    availableTags.value = res.data ?? []
  } catch (err) {
    console.error('Failed to fetch tags', err)
  }
}

const toggleTagFilter = (id: number) => {
  const next = new Set(selectedTagIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedTagIds.value = next
  currentPage.value = 1
}

const fetchUserId = async () => {
  try {
    const res = await getWithToken<{ id: number }>('/v1/users/')
    myUserId.value = res.data.id
  } catch (err) {
    console.error('Failed to fetch user ID', err)
  }
}

const fetchDives = async () => {
  isLoading.value = true
  status.value = ''
  try {
    let url = ''
    if (hasDateTimeFilter.value) {
      // Combines every active filter with AND semantics, unlike the standalone modes below.
      const params: string[] = [
        `page=${currentPage.value - 1}`,
        `sortCol=${sortColumn.value}`,
        `sortDirection=${sortDirection.value}`,
      ]
      if (startDate.value) params.push(`startDate=${encodeURIComponent(startDate.value)}`)
      if (endDate.value) params.push(`endDate=${encodeURIComponent(endDate.value)}`)
      if (startTimeOfDay.value) params.push(`startTime=${encodeURIComponent(startTimeOfDay.value)}`)
      if (endTimeOfDay.value) params.push(`endTime=${encodeURIComponent(endTimeOfDay.value)}`)
      if (searchQuery.value.trim()) params.push(`query=${encodeURIComponent(searchQuery.value.trim())}`)
      if (diveSiteId.value) params.push(`diveSiteId=${diveSiteId.value}`)
      if (suitId.value) params.push(`suitId=${suitId.value}`)
      if (baseConfiguration.value) params.push(`baseConfiguration=${baseConfiguration.value}`)
      selectedTagIds.value.forEach((id) => params.push(`tagIds=${id}`))
      url = `/v1/dives/filtered?${params.join('&')}`
    } else if (searchQuery.value.trim()) {
      // Search mode - no sorting applied, best match from server
      url = `/v1/dives/search?page=${currentPage.value - 1}&query=${encodeURIComponent(searchQuery.value)}`
    } else if (computerId.value) {
      // Filter by dive computer
      url = `/v1/dives/computer?computerId=${computerId.value}&page=${currentPage.value - 1}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    } else if (suitId.value) {
      // Filter by suit
      url = `/v1/dives/suit?suitId=${suitId.value}&page=${currentPage.value - 1}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    } else if (selectedTagIds.value.size) {
      // Filter by one or more tags (AND: dive must have all selected tags)
      const tagParams = [...selectedTagIds.value].map((id) => `tagIds=${id}`).join('&')
      url = `/v1/dives/tags?${tagParams}&page=${currentPage.value - 1}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}&includeReader=${viewShared.value}`
    } else {
      // Normal mode - apply server-side sorting
      url = `/v1/dives?page=${currentPage.value - 1}&includeReader=${viewShared.value}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    }

    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(url)
    dives.value = res.data.result ?? []
    totalPages.value = res.data.totalPages ?? 0
    totalElements.value = res.data.totalElements ?? dives.value.length
    pageSize.value = res.data.pageSize ?? 20

    if (!dives.value.length) {
      status.value = searchQuery.value ? 'No dives match your search.' : 'No dives found.'
    }
  } catch (e) {
    console.error(e)
    status.value = 'Failed to load dives.'
    toast.error('Failed to load dives.')
  } finally {
    isLoading.value = false
  }
}

const handleSearch = debounce(() => {
  currentPage.value = 1
}, 300)

const toggleSharedDives = () => {
  viewShared.value = !viewShared.value
  currentPage.value = 1
}

const sortBy = (serverCol: SortColumn | null) => {
  // Only allow sorting for valid columns
  if (!serverCol) {
    return
  }
  // Only allow sorting when not searching
  if (searchQuery.value.trim()) {
    return
  }

  if (sortColumn.value === serverCol) {
    sortDirection.value = sortDirection.value === 'ASCENDING' ? 'DESCENDING' : 'ASCENDING'
  } else {
    sortColumn.value = serverCol
    sortDirection.value = 'ASCENDING'
  }

  // Reset to first page
  currentPage.value = 1
}

// Selection via checkbox only
const selectedIds = ref<number[]>([])
const isSelectionMode = computed(() => selectedIds.value.length > 0)
const showBulkActions = ref(false)

const selectedDivesData = computed(() =>
  dives.value.filter((d) => selectedIds.value.includes(d.id)),
)

const toggleRow = (diveId: number) => {
  const index = selectedIds.value.indexOf(diveId)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(diveId)
  }
}

const toggleAll = () => {
  if (selectedIds.value.length === dives.value.length && dives.value.length > 0) {
    selectedIds.value = []
  } else {
    selectedIds.value = dives.value.map((d: DiveWithoutProfiles) => d.id)
  }
}

const clearSelection = () => {
  selectedIds.value = []
}

const handlePreviewRegenerated = (updatedDive: DiveWithoutProfiles) => {
  // Find and replace the dive in the array by ID
  const index = dives.value.findIndex((d) => d.id === updatedDive.id)
  if (index !== -1) {
    dives.value[index] = updatedDive
  }
}

const openBulkActions = () => {
  if (selectedIds.value.length === 0) {
    toast.error('No dives selected')
    return
  }
  showBulkActions.value = true
}

const handleBulkActionComplete = async () => {
  await fetchDives()
  const currentIds = new Set(dives.value.map((d) => d.id))
  selectedIds.value = selectedIds.value.filter((id) => currentIds.has(id))
}

const onRowClick = (diveId: number) => {
  if (isSelectionMode.value) {
    toggleRow(diveId)
  } else {
    router.push({ name: 'DiveView', params: { diveId } })
  }
}

const handleSearchEscape = () => {
  searchInputRef.value?.blur()
}

// Keyboard shortcuts for DiveListView
const handleDiveListKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  // Don't intercept keyboard shortcuts while the user is typing in a field
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return
  }

  // '/' to focus search
  if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const searchInput = document.querySelector(
      'input[placeholder="Search dives..."]',
    ) as HTMLInputElement
    searchInput?.focus()
  }
  // 'a' to toggle shared dives view
  if (event.key.toLowerCase() === 'a' && !event.ctrlKey && !event.metaKey) {
    toggleSharedDives()
  }
  // 'm' for bulk actions when in selection mode
  if (
    event.key.toLowerCase() === 'm' &&
    !event.ctrlKey &&
    !event.metaKey &&
    isSelectionMode.value
  ) {
    openBulkActions()
  }
  // Escape to clear selection
  if (event.key === 'Escape' && isSelectionMode.value) {
    clearSelection()
  }
}

// Row click navigates directly; selection and action button removed

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document?.documentElement?.scrollTo?.({ top: 0, behavior: 'smooth' })
    })
  }
}

// Sync state to URL query params
const updateUrlQuery = () => {
  const tagIds = selectedTagIds.value.size
    ? [...selectedTagIds.value].map(String)
    : undefined
  router.replace({
    query: {
      page: currentPage.value > 1 ? String(currentPage.value) : undefined,
      search: searchQuery.value || undefined,
      shared: viewShared.value ? 'true' : undefined,
      sortCol: sortColumn.value !== 'NUMBER' ? sortColumn.value : undefined,
      sortDir: sortDirection.value !== 'DESCENDING' ? sortDirection.value : undefined,
      tagIds,
      startDate: startDate.value ?? undefined,
      endDate: endDate.value ?? undefined,
      startTime: startTimeOfDay.value ?? undefined,
      endTime: endTimeOfDay.value ?? undefined,
      diveSiteId: diveSiteId.value ? String(diveSiteId.value) : undefined,
      suitId: suitId.value ? String(suitId.value) : undefined,
      baseConfiguration: baseConfiguration.value ?? undefined,
    },
  })
}

const clearTimelineFilters = () => {
  startDate.value = null
  endDate.value = null
  startTimeOfDay.value = null
  endTimeOfDay.value = null
  diveSiteId.value = null
  baseConfiguration.value = null
  suitId.value = null
  selectedTagIds.value = new Set()
  searchQuery.value = ''
  currentPage.value = 1
}

const clearTagFilter = () => {
  selectedTagIds.value = new Set()
  currentPage.value = 1
}

// Watchers
watch(
  [
    currentPage,
    searchQuery,
    viewShared,
    sortColumn,
    sortDirection,
    selectedTagIds,
    startDate,
    endDate,
    startTimeOfDay,
    endTimeOfDay,
    diveSiteId,
    suitId,
    baseConfiguration,
  ],
  () => {
    updateUrlQuery()
    fetchDives()
  },
)

// Initial load
onMounted(() => {
  fetchUserId()
  fetchAvailableTags()
  fetchAvailableYears()
  fetchDives()
  window.addEventListener('keydown', handleDiveListKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDiveListKeydown)
})
</script>

<style scoped></style>
