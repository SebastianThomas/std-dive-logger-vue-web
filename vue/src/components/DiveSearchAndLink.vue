<template>
  <div class="space-y-4">
    <input
      v-model="searchTerm"
      type="text"
      placeholder="Search my dives..."
      class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      @input="handleSearch"
    />
    <ul class="space-y-2">
      <li
        v-for="d in myDives"
        :key="d.id"
        class="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
      >
        <div>
          <p class="text-sm font-medium dark:text-white">{{ d.customIdentifier }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            #{{ d.number }} · {{ currentDiveSiteName }} ·
            {{
              currentDiveStartDate
                ? new Date(currentDiveStartDate).toLocaleString()
                : 'No start date'
            }}
          </p>
        </div>
        <button
          @click="handleLinkDive(d.id)"
          class="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          Link
        </button>
      </li>
      <li v-if="myDives.length === 0" class="text-sm text-gray-400">No dives found</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import debounce from '@/lib/utils/debounce'
import type { DiveWithoutProfiles, PagedResult } from '@/lib/types/dive'

interface Props {
  currentDiveId: number
  currentDiveSiteName: string
  currentDiveStartDate?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  diveLinked: [diveId: number]
}>()

const { getWithToken, postWithToken } = useApi()

const myDives = ref<DiveWithoutProfiles[]>([])
const searchTerm = ref('')

const fetchMyDives = async () => {
  try {
    const url = searchTerm.value.trim()
      ? `/v1/dives/search?page=0&query=${encodeURIComponent(searchTerm.value)}`
      : '/v1/dives?page=0&sortCol=NUMBER&sortDirection=ASCENDING'
    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(url)
    myDives.value = res.data.result
  } catch (err) {
    console.error('Failed to fetch my dives', err)
  }
}

const handleSearch = debounce(() => {
  fetchMyDives()
}, 300)

const handleLinkDive = async (buddyDiveId: number) => {
  try {
    await postWithToken(`/v1/dives/${props.currentDiveId}/link?buddyDiveId=${buddyDiveId}`, {})
    toast.success('Dive linked successfully')
    emit('diveLinked', buddyDiveId)
  } catch (err) {
    console.error('Link failed', err)
    toast.error('Failed to link dive')
  }
}

// Initial fetch
fetchMyDives()
</script>
