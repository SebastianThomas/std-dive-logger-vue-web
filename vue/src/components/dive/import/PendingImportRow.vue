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

    <p v-if="autoAttachNote" class="text-xs text-sky-600 dark:text-sky-400">
      <i class="fas fa-link mr-1"></i>{{ autoAttachNote }}
    </p>

    <div v-if="mode === 'new'" class="flex flex-col gap-2">
      <label class="text-sm font-medium dark:text-gray-300">Dive site</label>
      <div class="flex items-center gap-2">
        <span
          class="text-sm"
          :class="siteResolved ? 'dark:text-gray-200' : 'text-red-600 dark:text-red-400 font-medium'"
        >
          <i v-if="!siteResolved" class="fas fa-triangle-exclamation mr-1"></i>
          {{ siteLabel }}
        </span>
        <button
          type="button"
          class="text-sm text-sky-600 hover:text-sky-700"
          @click="showSiteSelector = true"
        >
          {{ siteResolved ? 'Change' : 'Choose' }}
        </button>
      </div>
      <p v-if="!siteResolved" class="text-xs text-red-600 dark:text-red-400">
        A dive site is required - this import will fail to save until one is chosen.
      </p>
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
            @click="selectExistingDive(d)"
          >
            {{ linkToExistingDiveId === d.id ? 'Selected' : 'Select' }}
          </button>
        </li>
        <li v-if="myDives.length === 0" class="text-xs text-gray-400">No dives found</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="previewLoading"
          class="text-sm text-sky-600 hover:text-sky-700 disabled:opacity-50"
          @click="togglePreview"
        >
          {{ previewLoading ? 'Loading preview...' : previewProfiles ? 'Hide preview' : 'Preview & trim' }}
        </button>
        <span v-if="profileTrims.size > 0" class="text-xs text-emerald-600 dark:text-emerald-400">
          <i class="fa-solid fa-scissors mr-1"></i>{{ profileTrims.size }} profile(s) trimmed
        </span>
      </div>

      <div v-if="previewProfiles" class="space-y-2">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(profile, idx) in previewProfiles"
            :key="profile.id"
            class="flex items-center gap-1 px-2 py-1 text-xs rounded border"
            :class="
              profileTrims.has(profile.id)
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-300 dark:border-gray-600'
            "
          >
            <button
              type="button"
              :disabled="trimProfileId !== null"
              class="disabled:opacity-50"
              @click="startTrimmingProfile(profile.id)"
            >
              <i class="fa-solid fa-scissors mr-1"></i>Trim profile {{ idx + 1
              }}{{ profileTrims.has(profile.id) ? ' ✓' : '' }}
            </button>
            <button
              v-if="profileTrims.has(profile.id)"
              type="button"
              class="opacity-70 hover:opacity-100"
              title="Clear this trim"
              @click="clearProfileTrim(profile.id)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="relative h-64 border rounded dark:border-gray-600">
          <DiveGraph
            :profiles="previewProfiles"
            :dive-id="0"
            :trim-profile-id="trimProfileId"
            @trim-confirmed="confirmTrimmingProfile"
            @trim-cancelled="cancelTrimmingProfile"
            @trim-profile-changed="startTrimmingProfile"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        :disabled="
          busy || (mode === 'existing' ? !linkToExistingDiveId : !siteResolved)
        "
        :title="mode === 'new' && !siteResolved ? 'Choose a dive site first' : undefined"
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

  <DeletionConfirmation
    v-model="showDateGapWarning"
    title="Dates are far apart"
    :message="dateGapWarningMessage"
    confirm-text="Attach anyway"
    @confirm="confirmPendingDiveSelection"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { resolveImporterUrl } from '@/lib/globals/url/resolveUrl'
import { formatDate } from '@/lib/utils/timeUtils'
import debounce from '@/lib/utils/debounce'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { useProfileTrimming } from '@/composables/useProfileTrimming'
import DiveSiteSelector from '@/components/DiveSiteSelector.vue'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import type {
  DiveProfile,
  DiveSite,
  DiveWithoutProfiles,
  PagedResult,
  PendingImportCommitRequest,
  PendingImportSummary,
} from '@/lib/types/dive'

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
// A name guess alone doesn't *guarantee* the commit will succeed (the backend still needs to
// resolve it to an existing site, or have coordinates to create one from) - but the guaranteed-
// fail case is having nothing at all, which is what previously only surfaced as a commit-time
// error. Once the user has explicitly picked a site via the selector, it's resolved regardless.
const siteResolved = computed(() => !!chosenSite.value || !!props.summary.siteNameGuess)

const diveSearchTerm = ref('')
const myDives = ref<DiveWithoutProfiles[]>([])
const linkToExistingDiveId = ref<number | null>(null)

// Preview/trim - fetched on demand (see previewPending on the backend: not sent at stage time to
// avoid round-tripping full measurement data for staged imports nobody ends up reviewing).
// Profile ids here are the profile's own array index (there's no real persisted id yet), which is
// also what profileTrims is keyed by - the backend applies each by that same index at commit time.
const previewProfiles = ref<DiveProfile[] | null>(null)
const previewLoading = ref(false)
const {
  trimProfileId,
  startTrimming: startTrimmingProfile,
  cancelTrimming: cancelTrimmingProfile,
} = useProfileTrimming()
const profileTrims = ref<Map<number, { start: number; end: number }>>(new Map())

const togglePreview = async () => {
  if (previewProfiles.value) {
    previewProfiles.value = null
    return
  }
  previewLoading.value = true
  try {
    const res = await getWithToken<DiveProfile[]>(
      resolveImporterUrl(`/v1/import/pending/${props.summary.id}/preview`),
    )
    previewProfiles.value = res.data
  } catch (err) {
    console.error('Failed to load pending import preview', err)
    toast.error(`Failed to load preview: ${extractErrorDetail(err)}`)
  } finally {
    previewLoading.value = false
  }
}

const confirmTrimmingProfile = (range: { profileId: number; start: number; end: number }) => {
  profileTrims.value.set(range.profileId, { start: range.start, end: range.end })
  trimProfileId.value = null
}

const clearProfileTrim = (profileId: number) => {
  profileTrims.value.delete(profileId)
}

// Attaching to the wrong dive silently merges unrelated profiles together (e.g. two dives
// months apart) with no way to undo it short of manually deleting the merged-in profile -
// so anything more than half a day off from the import's own date needs an explicit
// confirmation rather than a single accidental click.
const HALF_DAY_MS = 12 * 60 * 60 * 1000
const showDateGapWarning = ref(false)
const dateGapWarningMessage = ref('')
const pendingDiveSelection = ref<DiveWithoutProfiles | null>(null)

const selectExistingDive = (d: DiveWithoutProfiles) => {
  const importDate = props.summary.startDate
  const diveDate = d.summary.start
  if (
    importDate !== undefined &&
    diveDate !== undefined &&
    Math.abs(importDate - diveDate) > HALF_DAY_MS
  ) {
    pendingDiveSelection.value = d
    dateGapWarningMessage.value =
      `This import starts ${formatDate(importDate)}, but dive #${d.number} starts ` +
      `${formatDate(diveDate)} - more than half a day apart. Attaching it here will merge ` +
      `what looks like an unrelated dive's profile into #${d.number}. Continue anyway?`
    showDateGapWarning.value = true
    return
  }
  linkToExistingDiveId.value = d.id
}

const confirmPendingDiveSelection = () => {
  if (pendingDiveSelection.value) {
    linkToExistingDiveId.value = pendingDiveSelection.value.id
  }
  showDateGapWarning.value = false
  pendingDiveSelection.value = null
}

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

// If the source file's guessed dive number already matches one of the diver's dives - whether
// because it's a plain re-run-into-the-same-number case, or because the file encoded a
// "+"/"-"-prefixed Shearwater bailout/CC companion marker (see UddfFile.diveNumber() on the
// backend) - "New dive" would be the wrong default: a fractional guess makes the backend attach
// to that number on commit regardless of what's selected here, so showing "New dive" would be
// actively misleading. Preselect "attach to existing dive" (still overridable) instead.
const autoAttachNote = ref<string | null>(null)

const checkForAutoAttach = async () => {
  const guess = props.summary.diveNumberGuess
  if (guess === undefined) return
  try {
    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(
      `/v1/dives/search?page=0&query=${encodeURIComponent(String(guess))}`,
    )
    const match = res.data.result.find((d) => d.number === guess)
    if (match) {
      mode.value = 'existing'
      autoAttachNote.value = `Auto-selected: dive #${guess} already exists in your log.`
      selectExistingDive(match)
    } else if (props.summary.diveNumberFractional) {
      autoAttachNote.value =
        `This file marks itself as an OC/bailout or CC companion profile for dive #${guess}, ` +
        `but no dive with that number was found yet - import the other profile first, or this ` +
        `commit will fail.`
    }
  } catch (err) {
    console.error('Failed to check for a matching dive number', err)
  }
}
checkForAutoAttach()

const commit = async () => {
  busy.value = true
  try {
    const profileTrimsOverride =
      profileTrims.value.size > 0
        ? Array.from(profileTrims.value.entries()).map(([profileIndex, range]) => ({
            profileIndex,
            trimStart: range.start,
            trimEnd: range.end,
          }))
        : undefined
    const overrides: PendingImportCommitRequest =
      mode.value === 'existing'
        ? {
            linkToExistingDiveId: linkToExistingDiveId.value ?? undefined,
            profileTrims: profileTrimsOverride,
          }
        : {
            diveIdentifier: identifier.value || undefined,
            diveSiteId: chosenSite.value?.id,
            profileTrims: profileTrimsOverride,
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
