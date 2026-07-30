<template>
  <div class="border rounded-lg p-4 dark:border-gray-600 space-y-3">
    <div class="flex justify-between items-start">
      <div>
        <p class="font-medium dark:text-white">
          {{ identifier || summary.filename || `Pending import #${summary.id}` }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ summary.source }} · {{ summary.startDate ? formatDate(summary.startDate) : 'No date' }}
          <span v-if="summary.maxDepth"> · {{ summary.maxDepth.toFixed(1) }}m</span>
          <span v-if="summary.computerSerial"> · {{ summary.computerSerial }}</span>
        </p>
      </div>
      <button
        type="button"
        :disabled="busy"
        class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        @click="discard"
      >
        Discard
      </button>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium dark:text-gray-300">Dive name</label>
      <input
        v-model="identifier"
        type="text"
        class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
      />
    </div>

    <div class="flex gap-2 text-sm">
      <button
        type="button"
        class="px-2 py-1 rounded border"
        :class="
          mode === 'new'
            ? 'bg-sky-100 dark:bg-sky-900 border-sky-400'
            : 'border-gray-300 dark:border-gray-600'
        "
        @click="mode = 'new'"
      >
        New dive
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded border"
        :class="
          mode === 'existing'
            ? 'bg-sky-100 dark:bg-sky-900 border-sky-400'
            : 'border-gray-300 dark:border-gray-600'
        "
        @click="mode = 'existing'"
      >
        Attach to existing dive
      </button>
    </div>

    <div v-if="mode === 'new'" class="flex flex-col gap-2">
      <label class="text-sm font-medium dark:text-gray-300">Dive site</label>
      <div class="flex items-center gap-2">
        <span class="text-sm dark:text-gray-200">{{ siteLabel }}</span>
        <button
          type="button"
          class="text-sm text-sky-600 hover:text-sky-700"
          @click="showSiteSelector = true"
        >
          Change
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col gap-2">
      <input
        v-model="diveSearchTerm"
        type="text"
        placeholder="Search my dives..."
        class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
        @input="handleDiveSearch"
      />
      <ul class="space-y-1 max-h-40 overflow-auto">
        <li
          v-for="d in myDives"
          :key="d.id"
          class="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm"
        >
          <span>#{{ d.number }} · {{ d.customIdentifier }}</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded text-xs"
            :class="
              linkToExistingDiveId === d.id
                ? 'bg-sky-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600'
            "
            @click="linkToExistingDiveId = d.id"
          >
            {{ linkToExistingDiveId === d.id ? 'Selected' : 'Select' }}
          </button>
        </li>
        <li v-if="myDives.length === 0" class="text-xs text-gray-400">No dives found</li>
      </ul>
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        :disabled="busy || (mode === 'existing' && !linkToExistingDiveId)"
        class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        @click="commit"
      >
        {{ busy ? 'Saving...' : 'Commit' }}
      </button>
    </div>
  </div>

  <DiveSiteSelector
    v-if="showSiteSelector"
    :initial-name="summary.siteNameGuess"
    @site-selected="onSiteChosen"
    @site-created="onSiteChosen"
    @close="showSiteSelector = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { resolveImporterUrl } from '@/lib/globals/url/resolveUrl'
import { formatDate } from '@/lib/utils/timeUtils'
import debounce from '@/lib/utils/debounce'
import DiveSiteSelector from '@/components/DiveSiteSelector.vue'
import type {
  DiveSite,
  DiveWithoutProfiles,
  PagedResult,
  PendingImportCommitRequest,
  PendingImportSummary,
} from '@/lib/types/dive'

/** Pulls the human-readable ProblemDetail `detail` out of a failed request, if present. */
const extractErrorDetail = (err: unknown): string => {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as { detail?: string; title?: string }
    return data.detail ?? data.title ?? 'Please try again.'
  }
  return 'Please try again.'
}

const props = defineProps<{ summary: PendingImportSummary }>()
const emit = defineEmits<{
  committed: [pendingImportId: number, dive: DiveWithoutProfiles]
  discarded: [id: number]
}>()

const { getWithToken, postWithToken, deleteWithToken } = useApi()

const identifier = ref(props.summary.diveIdentifierGuess ?? '')
const mode = ref<'new' | 'existing'>('new')
const busy = ref(false)

const showSiteSelector = ref(false)
const chosenSite = ref<DiveSite | null>(null)
const siteLabel = ref(props.summary.siteNameGuess ?? 'Not set - please choose a site')

const diveSearchTerm = ref('')
const myDives = ref<DiveWithoutProfiles[]>([])
const linkToExistingDiveId = ref<number | null>(null)

const onSiteChosen = (site: DiveSite) => {
  chosenSite.value = site
  siteLabel.value = site.name
  showSiteSelector.value = false
}

const fetchMyDives = async () => {
  const url = diveSearchTerm.value.trim()
    ? `/v1/dives/search?page=0&query=${encodeURIComponent(diveSearchTerm.value)}`
    : '/v1/dives?page=0&sortCol=NUMBER&sortDirection=ASCENDING'
  try {
    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(url)
    myDives.value = res.data.result
  } catch (err) {
    console.error('Failed to fetch my dives', err)
  }
}
const handleDiveSearch = debounce(fetchMyDives, 300)
fetchMyDives()

const commit = async () => {
  busy.value = true
  try {
    const overrides: PendingImportCommitRequest =
      mode.value === 'existing'
        ? { linkToExistingDiveId: linkToExistingDiveId.value ?? undefined }
        : {
            diveIdentifier: identifier.value || undefined,
            diveSiteId: chosenSite.value?.id,
          }
    const res = await postWithToken<DiveWithoutProfiles, PendingImportCommitRequest>(
      resolveImporterUrl(`/v1/import/pending/${props.summary.id}/commit`),
      overrides,
    )
    toast.success('Dive imported')
    emit('committed', props.summary.id, res.data)
  } catch (err) {
    console.error('Failed to commit pending import', err)
    toast.error(`Failed to commit import: ${extractErrorDetail(err)}`, { duration: 10000 })
  } finally {
    busy.value = false
  }
}

const discard = async () => {
  busy.value = true
  try {
    await deleteWithToken(resolveImporterUrl(`/v1/import/pending/${props.summary.id}`))
    emit('discarded', props.summary.id)
  } catch (err) {
    console.error('Failed to discard pending import', err)
    toast.error('Failed to discard import. Please try again.')
  } finally {
    busy.value = false
  }
}
</script>
