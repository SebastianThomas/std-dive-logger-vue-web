<template>
  <div class="min-h-[calc(100vh-70px)] flex flex-col py-0 px-0 md:mx-10">
    <div
      class="w-full md:max-w-7xl bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 space-y-4"
    >
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">Dive List</h1>
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

      <!-- Search Bar -->
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search dives..."
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
import type { DiveWithoutProfiles, PagedResult } from '../lib/types/dive'
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
const pageSize = ref(20)

const searchQuery = ref((route.query.search as string) || '')
const viewShared = ref(route.query.shared === 'true')
const searchInputRef = ref<HTMLInputElement | null>(null)
const computerId = ref(route.query.computerId ? Number(route.query.computerId) : null)
const suitId = ref(route.query.suitId ? Number(route.query.suitId) : null)

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
    if (searchQuery.value.trim()) {
      // Search mode - no sorting applied, best match from server
      url = `/v1/dives/search?page=${currentPage.value - 1}&query=${encodeURIComponent(searchQuery.value)}`
    } else if (computerId.value) {
      // Filter by dive computer
      url = `/v1/dives/computer?computerId=${computerId.value}&page=${currentPage.value - 1}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    } else if (suitId.value) {
      // Filter by suit
      url = `/v1/dives/suit?suitId=${suitId.value}&page=${currentPage.value - 1}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    } else {
      // Normal mode - apply server-side sorting
      url = `/v1/dives?page=${currentPage.value - 1}&includeReader=${viewShared.value}&sortCol=${sortColumn.value}&sortDirection=${sortDirection.value}`
    }

    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(url)
    dives.value = res.data.result ?? []
    totalPages.value = res.data.totalPages ?? 0
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

const handleBulkActionComplete = () => {
  selectedIds.value = []
  fetchDives()
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
  // Don't trigger if typing in input
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    // '/' to focus search
    if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      const searchInput = document.querySelector(
        'input[placeholder="Search dives..."]',
      ) as HTMLInputElement
      searchInput?.focus()
    }
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
  router.replace({
    query: {
      page: currentPage.value > 1 ? String(currentPage.value) : undefined,
      search: searchQuery.value || undefined,
      shared: viewShared.value ? 'true' : undefined,
      sortCol: sortColumn.value !== 'NUMBER' ? sortColumn.value : undefined,
      sortDir: sortDirection.value !== 'DESCENDING' ? sortDirection.value : undefined,
    },
  })
}

// Watchers
watch([currentPage, searchQuery, viewShared, sortColumn, sortDirection], () => {
  updateUrlQuery()
  fetchDives()
})

// Initial load
onMounted(() => {
  fetchUserId()
  fetchDives()
  window.addEventListener('keydown', handleDiveListKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDiveListKeydown)
})
</script>

<style scoped></style>
