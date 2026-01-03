<template>
  <div class="min-h-[calc(100vh-70px)] flex flex-col py-0 px-0 md:mx-10">
    <div class="w-full md:max-w-7xl bg-white rounded-lg shadow p-4 md:p-6 space-y-4">
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
            v-model="searchQuery"
            type="text"
            placeholder="Search dives..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            @input="handleSearch"
          />
        </div>
        <button
          @click="toggleSharedDives"
          :class="[
            'px-4 py-2 rounded-md border text-sm font-medium transition',
            viewShared
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
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
      <div class="overflow-auto border rounded-lg">
        <table class="w-full border-collapse overflow-scroll">
          <thead>
            <tr class="bg-blue-200">
              <th class="border border-gray-400 px-2 py-2 text-left w-12">
                <input
                  type="checkbox"
                  :checked="selectedIds.length === dives.length && dives.length > 0"
                  @change="toggleAll"
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
                @click="col.sortable ? sortBy(col.serverCol) : null"
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
              @click="onRowClick(dive.id)"
            >
              <td class="border border-gray-400 px-2 py-2 text-center" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(dive.id)"
                  @click.stop
                  @change="toggleRow(dive.id)"
                  class="cursor-pointer"
                />
              </td>
              <td class="border border-gray-400 px-3 py-2 w-16">{{ dive.number }}</td>
              <td class="border border-gray-400 px-1 py-1 w-24 flex justify-center">
                <DiveSitePreview :dive="dive" @preview-regenerated="handlePreviewRegenerated" />
              </td>
              <td class="border border-gray-400 px-3 py-2 max-w-lg wrap-break-word">
                {{ dive.customIdentifier || '-' }}
              </td>
              <td class="border border-gray-400 px-3 py-2 min-w-48">
                {{ dive.site?.name || 'Unknown' }}
              </td>
              <td class="border border-gray-400 px-3 py-2 w-32">
                {{ dive.user.id === myUserId ? 'You' : dive.user?.name || 'Unknown' }}
              </td>
            </tr>
            <tr v-if="!dives.length && !isLoading">
              <td colspan="5" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
                {{ status || 'No dives found' }}
              </td>
            </tr>
            <tr v-if="isLoading">
              <td colspan="5" class="border border-gray-400 px-3 py-4 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '../composables/useApi'
import BulkActionsModal from '@/components/dive/BulkActionsModal.vue'
import DiveSitePreview from '@/components/DiveSitePreview.vue'
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
  { key: 'site', label: 'Profile', serverCol: null, sortable: false, width: 'w-24' },
  {
    key: 'customIdentifier',
    label: 'Custom Name',
    serverCol: 'CUSTOM_IDENTIFIER',
    sortable: true,
  },
  { key: 'site', label: 'Site', serverCol: null, sortable: false },
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
})
</script>

<style scoped></style>
