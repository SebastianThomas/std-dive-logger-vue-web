<template>
  <div
    class="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed min-h-[calc(100vh-70px)] flex flex-col items-center py-8 px-4 md:px-10"
  >
    <div class="w-full max-w-7xl bg-white rounded-lg shadow p-6 space-y-4">
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
                  col.sortable && !searchQuery.trim() ? 'cursor-pointer hover:bg-blue-300' : '',
                  !col.sortable || searchQuery.trim() ? 'cursor-default opacity-60' : ''
                ]"
                @click="col.sortable ? sortBy(col.serverCol) : null"
              >
                <div class="flex items-center gap-2">
                  {{ col.label }}
                  <span v-if="col.sortable && sortColumn === col.serverCol && !searchQuery.trim()" class="text-xs">
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
                  ? 'bg-sky-100 hover:bg-sky-200'
                  : 'hover:bg-gray-50',
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
              <td class="border border-gray-400 px-3 py-2">{{ dive.number }}</td>
              <td class="border border-gray-400 px-3 py-2">
                {{ dive.customIdentifier || '-' }}
              </td>
              <td class="border border-gray-400 px-3 py-2">
                {{ dive.site?.name || 'Unknown' }}
                <span class="text-gray-500 text-sm">
                  ({{ dive.site?.latitude?.toFixed(2) }}°N,
                  {{ dive.site?.longitude?.toFixed(2) }}°E)
                </span>
              </td>
              <td class="border border-gray-400 px-3 py-2">{{ dive.user?.name || 'Unknown' }}</td>
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
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Page {{ currentPage }} of {{ totalPages }} (~{{ totalPages * pageSize }} total dives)
        </div>
        <div class="flex gap-2">
          <button
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-3 py-1 rounded border',
              currentPage === page
                ? 'bg-sky-600 text-white border-sky-600'
                : 'border-gray-300 hover:bg-gray-100',
            ]"
          >
            {{ page }}
          </button>
          <button
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '../composables/useApi'
import type { DiveWithoutProfiles, PagedResult } from '../lib/types/dive'
import debounce from '../lib/utils/debounce'
import type { SortDirection, SortColumn } from '@/lib/types/sort'

const router = useRouter()
const { getWithToken } = useApi()

// State
const dives = ref<DiveWithoutProfiles[]>([])
const status = ref('')
const isLoading = ref(false)

// Pagination
const currentPage = ref(1)
const totalPages = ref(0)
const pageSize = ref(20)

// Search and filters
const searchQuery = ref('')
const viewShared = ref(false)

// Sorting
const sortColumn = ref<SortColumn>('NUMBER')
const sortDirection = ref<SortDirection>('DESCENDING')

// Column definitions with server mapping
const columns: { key: keyof DiveWithoutProfiles; label: string; serverCol: SortColumn | null; sortable: boolean }[] = [
  { key: 'number', label: 'Number', serverCol: 'NUMBER', sortable: true },
  { key: 'customIdentifier', label: 'Custom ID', serverCol: 'CUSTOM_IDENTIFIER', sortable: true },
  { key: 'site', label: 'Site', serverCol: null, sortable: false },
  { key: 'user', label: 'Diver', serverCol: null, sortable: false },
]

// Computed
const visiblePages = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push(-1) // ellipsis
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push(-1)
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push(-1)
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push(-1)
      pages.push(total)
    }
  }

  return pages.filter((p) => p > 0)
})

// Functions
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
  fetchDives()
}, 300)

const toggleSharedDives = () => {
  viewShared.value = !viewShared.value
  currentPage.value = 1
  fetchDives()
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

  // Trigger server-side fetch with new sort parameters
  currentPage.value = 1
  fetchDives()
}

// Selection via checkbox only
const selectedIds = ref<number[]>([])
const isSelectionMode = computed(() => selectedIds.value.length > 0)
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
  fetchDives()
}

// Watchers
watch(currentPage, fetchDives)

// Initial load
fetchDives()
</script>

<style scoped></style>
