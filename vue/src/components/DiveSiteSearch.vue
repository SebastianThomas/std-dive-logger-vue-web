<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <input
        v-model="searchTerm"
        type="text"
        :placeholder="placeholder"
        class="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
        @input="handleSearch"
      />
      <button
        v-if="results.length > 0"
        type="button"
        class="px-3 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
        @click="showMap = !showMap"
      >
        {{ showMap ? 'Hide map' : 'Show on map' }}
      </button>
    </div>

    <div
      v-if="showMap && results.length > 0"
      class="h-48 sm:h-64 rounded-lg overflow-hidden border dark:border-gray-600"
    >
      <DiveSiteSearchResultsMap :sites="results" @select="selectSite" />
    </div>

    <ul
      v-if="results.length > 0"
      class="max-h-48 overflow-y-auto border rounded-lg divide-y dark:divide-gray-700 dark:border-gray-600"
    >
      <li
        v-for="site in results"
        :key="site.id ?? site.name"
        class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
        @click="selectSite(site)"
      >
        {{ site.name }}
      </li>
    </ul>
    <p v-else-if="searched && searchTerm.trim()" class="text-sm text-gray-400">
      No dive sites found
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import debounce from '@/lib/utils/debounce'
import DiveSiteSearchResultsMap from '@/components/DiveSiteSearchResultsMap.vue'
import type { DiveSite, PagedResult } from '@/lib/types/dive'

interface Props {
  placeholder?: string
  /** Pre-fills the search box (e.g. the currently selected site's name) without triggering a search. */
  initialValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search dive sites by name...',
  initialValue: '',
})

const emit = defineEmits<{
  selected: [site: DiveSite]
}>()

const { getWithToken } = useApi()

const searchTerm = ref(props.initialValue)
const results = ref<DiveSite[]>([])
const showMap = ref(false)
const searched = ref(false)

const fetchResults = async () => {
  const query = searchTerm.value.trim()
  if (!query) {
    results.value = []
    searched.value = false
    return
  }
  try {
    const res = await getWithToken<PagedResult<DiveSite>>(
      `/v1/dives/sites/search?page=0&query=${encodeURIComponent(query)}`,
    )
    results.value = res.data.result
  } catch (err) {
    console.error('Failed to search dive sites', err)
    results.value = []
  } finally {
    searched.value = true
  }
}

const handleSearch = debounce(fetchResults, 300)

const selectSite = (site: DiveSite) => {
  emit('selected', site)
  results.value = []
  searchTerm.value = site.name
  showMap.value = false
}
</script>
