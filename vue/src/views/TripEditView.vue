<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-3xl space-y-6">
      <div v-if="loading" class="text-center text-gray-400 py-8">
        <i class="fas fa-spinner fa-spin text-2xl"></i>
      </div>

      <template v-else-if="trip">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ trip.name }}</h1>
            <button
              class="text-sm text-red-600 hover:underline"
              @click="removeTrip"
            >
              Delete trip
            </button>
          </div>
          <!-- Auto-saves on blur/Enter/change - no separate Save button, so every field on this
               page behaves the same way instead of some needing an explicit click and others
               (add/remove dive, add/remove sub-trip) already saving immediately. -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                required
                @blur="saveDetails"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Type</label>
              <select
                v-model="form.type"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                @change="saveDetails"
              >
                <option value="TRIP">Trip</option>
                <option value="COURSE">Course</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Terminology</label>
              <select
                v-model="form.teamTerminology"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                @change="saveDetails"
              >
                <option :value="null">Default (Buddy)</option>
                <option value="BUDDY">Buddy</option>
                <option value="TEAM">Team</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Contents: the dives and/or sub-trips directly under this trip - "Members" used to
             read too much like people, when this list is never divers. -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 class="text-lg font-semibold">Contents</h2>

          <ul v-if="members.length" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="(m, idx) in members" :key="idx" class="py-2 flex items-center justify-between">
              <template v-if="m.type === 'DIVE' && m.dive">
                <router-link
                  :to="{ name: 'DiveView', params: { diveId: m.dive.id } }"
                  class="hover:text-blue-600"
                >
                  <i class="fas fa-water mr-2 text-blue-500"></i>#{{ m.dive.number }} -
                  {{ m.dive.customIdentifier }}
                </router-link>
                <button
                  class="text-xs text-red-600 hover:underline"
                  @click="removeDiveMember(m.dive.id)"
                >
                  Remove
                </button>
              </template>
              <template v-else-if="m.type === 'TRIP' && m.subTrip">
                <router-link
                  :to="{ name: 'TripEdit', params: { tripId: String(m.subTrip.id) } }"
                  class="hover:text-blue-600"
                >
                  <i class="fas fa-folder-tree mr-2 text-teal-500"></i>{{ m.subTrip.name }}
                  <span class="text-xs text-gray-400">({{ DIVE_TRIP_TYPE_LABELS[m.subTrip.type] }})</span>
                </router-link>
                <button
                  class="text-xs text-red-600 hover:underline"
                  @click="removeTripMember(m.subTrip.id)"
                >
                  Remove
                </button>
              </template>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400 italic">Nothing added yet.</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium mb-1">Add a dive (search)</label>
              <input
                v-model="diveSearchQuery"
                type="text"
                placeholder="Search by identifier…"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700 mb-2"
                @input="searchDives"
              />
              <ul v-if="diveSearchResults.length" class="space-y-1 max-h-40 overflow-y-auto">
                <li v-for="d in diveSearchResults" :key="d.id">
                  <button
                    type="button"
                    class="text-sm text-blue-600 hover:underline"
                    @click="addDiveMember(d.id)"
                  >
                    #{{ d.number }} - {{ d.customIdentifier }}
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Add a sub-trip</label>
              <select
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                @change="addSubTripFromSelect"
              >
                <option value="">Select a trip…</option>
                <option
                  v-for="t in addableTrips"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.name }}
                </option>
              </select>
              <p class="text-xs text-gray-400 mt-1">
                Nesting a trip that would create a cycle is rejected automatically.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Add a range of dives (by number)</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="diveRangeFrom"
                  type="number"
                  min="1"
                  placeholder="From #"
                  class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                />
                <span class="text-gray-400">–</span>
                <input
                  v-model.number="diveRangeTo"
                  type="number"
                  min="1"
                  placeholder="To #"
                  class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                />
                <button
                  type="button"
                  :disabled="addingRange || !diveRangeFrom || !diveRangeTo"
                  class="shrink-0 px-3 py-1.5 bg-blue-600 text-white! rounded hover:bg-blue-700 disabled:opacity-50"
                  @click="addDiveRange"
                >
                  {{ addingRange ? 'Adding…' : 'Add' }}
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Adds every one of your own dives numbered in this inclusive range, e.g. dives you
                logged consecutively on the same liveaboard.
              </p>
            </div>
          </div>
        </div>

        <!-- Default team roster - auto-saves the whole roster on any field's blur/Enter/change,
             and immediately on removing an entry (adding a blank entry doesn't save until it's
             actually given a name). -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-3">
          <h2 class="text-lg font-semibold">Default Team Roster</h2>
          <p class="text-xs text-gray-400">
            A prefill template - copied onto a dive's named buddies when it's added to this trip
            (only if the dive doesn't already have any). Edited normally per-dive from there.
          </p>
          <div v-for="(entry, idx) in defaultTeamForm" :key="idx" class="flex gap-2 items-center">
            <BuddyNameAutocomplete
              v-if="entry.buddyUserId == null"
              v-model="entry.buddyName"
              placeholder="Buddy name"
              input-class="flex-1 rounded border px-2 py-1.5 dark:bg-gray-700"
              class="flex-1"
              :exclude-names="defaultTeamForm.map((e) => e.buddyName).filter((n) => n !== entry.buddyName)"
              @select="saveDefaultTeam"
              @blur="saveDefaultTeam"
              @enter="saveDefaultTeam"
            />
            <span v-else class="flex-1 px-2 py-1.5 text-sm">
              {{ entry.buddyName }} <span class="text-xs text-gray-400">(linked user)</span>
            </span>
            <select
              v-model="entry.role"
              class="rounded border px-2 py-1.5 dark:bg-gray-700"
              @change="saveDefaultTeam"
            >
              <option v-for="(label, key) in BUDDY_ROLE_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
            <button type="button" class="px-2 text-red-600 hover:text-red-800" @click="removeRosterEntry(idx)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <button
            type="button"
            class="text-sm text-blue-600 hover:underline"
            @click="defaultTeamForm.push({ buddyUserId: null, buddyName: '', role: 'EQUAL_EXPERIENCE' })"
          >
            + Add roster entry
          </button>
        </div>

        <!-- All dives transitively -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 class="text-lg font-semibold mb-3">
            All dives ({{ transitiveDivesTotal }} across this trip and its sub-trips)
          </h2>
          <ul v-if="transitiveDives.length" class="space-y-1">
            <li v-for="d in transitiveDives" :key="d.id">
              <router-link
                :to="{ name: 'DiveView', params: { diveId: d.id } }"
                class="text-sm text-blue-600 hover:underline"
              >
                #{{ d.number }} - {{ d.customIdentifier }}
              </router-link>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400 italic">No dives under this trip yet.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { toast } from 'vue-sonner'
import BuddyNameAutocomplete from '@/components/dive/BuddyNameAutocomplete.vue'
import {
  DIVE_TRIP_TYPE_LABELS,
  type DiveTrip,
  type DiveTripType,
  type DiveTripMember,
  type DiveTripDefaultTeamMember,
  type DiveTripListEntry,
} from '@/lib/types/trip'
import {
  BUDDY_ROLE_LABELS,
  type BasicDiveInfo,
  type BuddyRole,
  type DiveWithoutProfiles,
  type PagedResult,
  type TeamTerminology,
} from '@/lib/types/dive'

const route = useRoute()
const router = useRouter()
const { getWithToken, postWithToken, putWithToken, deleteWithToken } = useApi()

const tripId = () => route.params.tripId as string

const trip = ref<DiveTrip | null>(null)
const loading = ref(true)
const members = ref<DiveTripMember[]>([])
const transitiveDives = ref<BasicDiveInfo[]>([])
const transitiveDivesTotal = ref(0)
const allTrips = ref<DiveTrip[]>([])

const form = ref<{ name: string; type: DiveTripType; teamTerminology: TeamTerminology | null }>({
  name: '',
  type: 'TRIP',
  teamTerminology: null,
})

const defaultTeamForm = ref<
  { buddyUserId: number | null; buddyName: string; role: BuddyRole }[]
>([])
const savingTeam = ref(false)

const diveSearchQuery = ref('')
const diveSearchResults = ref<DiveWithoutProfiles[]>([])

const diveRangeFrom = ref<number | null>(null)
const diveRangeTo = ref<number | null>(null)
const addingRange = ref(false)

const addableTrips = computed(() =>
  allTrips.value.filter(
    (t) => t.id !== trip.value?.id && !members.value.some((m) => m.subTrip?.id === t.id),
  ),
)

// `showSpinner: false` is used after an in-place mutation (add/remove a dive or sub-trip) - those
// re-fetch the same data but must not flip `loading` back to true, which would unmount the whole
// page behind the loading spinner and remount it a moment later (a visible full-page "flash" for
// what should just be one list quietly updating).
const load = async (options: { showSpinner?: boolean } = {}) => {
  const showSpinner = options.showSpinner ?? true
  if (showSpinner) loading.value = true
  try {
    const [tripRes, membersRes, divesRes, allTripsRes] = await Promise.all([
      getWithToken<DiveTrip>(`/v1/dive-trips/${tripId()}`),
      getWithToken<DiveTripMember[]>(`/v1/dive-trips/${tripId()}/members`),
      getWithToken<PagedResult<BasicDiveInfo>>(`/v1/dive-trips/${tripId()}/dives?pageSize=200`),
      getWithToken<DiveTripListEntry[]>('/v1/dive-trips'),
    ])
    trip.value = tripRes.data
    members.value = membersRes.data
    transitiveDives.value = divesRes.data.result
    transitiveDivesTotal.value = divesRes.data.totalElements
    allTrips.value = allTripsRes.data.map((e) => e.trip)
    form.value = {
      name: tripRes.data.name,
      type: tripRes.data.type,
      teamTerminology: tripRes.data.teamTerminology ?? null,
    }

    const teamRes = await getWithToken<DiveTripDefaultTeamMember[]>(
      `/v1/dive-trips/${tripId()}/default-team`,
    )
    defaultTeamForm.value = teamRes.data.map((t) => ({
      buddyUserId: t.buddyUser?.id ?? null,
      buddyName: t.buddyUser?.name ?? t.buddyName ?? '',
      role: t.role,
    }))
  } catch (err) {
    toast.error(`Failed to load trip: ${extractErrorDetail(err)}`)
  } finally {
    if (showSpinner) loading.value = false
  }
}

// Auto-save, triggered on blur/Enter/change - silent on success (no toast for every field tabbed
// through), still loud on failure. Skips entirely on a blank name (e.g. cleared then tabbed away
// from) rather than sending a request the backend would just reject - the field keeps whatever
// was last actually saved until a real name is typed.
const saveDetails = async () => {
  if (!form.value.name.trim()) return
  try {
    const res = await putWithToken<DiveTrip>(`/v1/dive-trips/${tripId()}`, {
      name: form.value.name,
      type: form.value.type,
      teamTerminology: form.value.teamTerminology,
    })
    trip.value = res.data
  } catch (err) {
    toast.error(`Failed to update trip: ${extractErrorDetail(err)}`)
  }
}

const removeTrip = async () => {
  try {
    await deleteWithToken(`/v1/dive-trips/${tripId()}`)
    toast.success('Trip deleted')
    router.push({ name: 'TripList' })
  } catch (err) {
    toast.error(`Failed to delete trip: ${extractErrorDetail(err)}`)
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
// A dive already under this trip (directly, or via a nested sub-trip) is filtered out of the
// suggestions - re-adding it would just be a confusing no-op duplicate. Purely client-side: the
// search endpoint itself has no "exclude these ids" param, and doesn't need one for this - but a
// naive single-page fetch-then-filter could come up short (or empty) if most of the trip's own
// dives happen to rank in that first page, so this fetches extra pages first, at least enough raw
// results to *guarantee* room for real new ones even in the worst case (every one of this trip's
// own dives appears in what's fetched): (dives already under this trip) + SEARCH_RESULT_BUFFER.
const SEARCH_RESULT_BUFFER = 10
const searchDives = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const query = diveSearchQuery.value.trim()
    if (!query) {
      diveSearchResults.value = []
      return
    }
    const alreadyIncludedIds = new Set(transitiveDives.value.map((d) => d.id))
    const neededRawResults = alreadyIncludedIds.size + SEARCH_RESULT_BUFFER
    try {
      const collected: DiveWithoutProfiles[] = []
      let page = 0
      for (;;) {
        const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(
          `/v1/dives/search?page=${page}&query=${encodeURIComponent(query)}`,
        )
        collected.push(...res.data.result)
        const isLastPage = res.data.result.length === 0 || page + 1 >= res.data.totalPages
        if (collected.length >= neededRawResults || isLastPage) break
        page++
      }
      diveSearchResults.value = collected.filter((d) => !alreadyIncludedIds.has(d.id))
    } catch {
      diveSearchResults.value = []
    }
  }, 300)
}

const addDiveMember = async (diveId: number) => {
  try {
    await postWithToken(`/v1/dive-trips/${tripId()}/members/dives/${diveId}`, {})
    diveSearchQuery.value = ''
    diveSearchResults.value = []
    await load({ showSpinner: false })
  } catch (err) {
    toast.error(`Failed to add dive to trip: ${extractErrorDetail(err)}`)
  }
}

// Adds every one of the user's own dives numbered in [diveRangeFrom, diveRangeTo] - e.g. a run of
// consecutive liveaboard dives - in one action instead of searching and clicking each one.
const addDiveRange = async () => {
  const from = diveRangeFrom.value
  const to = diveRangeTo.value
  if (!from || !to) return
  if (from > to) {
    toast.error('The starting dive number must be at or before the ending one.')
    return
  }
  addingRange.value = true
  try {
    const alreadyIncludedIds = new Set(transitiveDives.value.map((d) => d.id))
    const matches: DiveWithoutProfiles[] = []
    let page = 0
    for (;;) {
      const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(
        `/v1/dives/filtered?minNumber=${from}&maxNumber=${to}&sortCol=NUMBER&sortDirection=ASCENDING&page=${page}`,
      )
      matches.push(...res.data.result)
      const isLastPage = res.data.result.length === 0 || page + 1 >= res.data.totalPages
      if (isLastPage) break
      page++
    }
    const toAdd = matches.filter((d) => !alreadyIncludedIds.has(d.id))
    if (!toAdd.length) {
      toast.error(`No dives numbered ${from}–${to} were found to add.`)
      return
    }
    for (const dive of toAdd) {
      await postWithToken(`/v1/dive-trips/${tripId()}/members/dives/${dive.id}`, {})
    }
    diveRangeFrom.value = null
    diveRangeTo.value = null
    await load({ showSpinner: false })
    toast.success(`Added ${toAdd.length} dive${toAdd.length === 1 ? '' : 's'} to the trip.`)
  } catch (err) {
    toast.error(`Failed to add dive range: ${extractErrorDetail(err)}`)
  } finally {
    addingRange.value = false
  }
}

const removeDiveMember = async (diveId: number) => {
  try {
    await deleteWithToken(`/v1/dive-trips/${tripId()}/members/dives/${diveId}`)
    await load({ showSpinner: false })
  } catch (err) {
    toast.error(`Failed to remove dive: ${extractErrorDetail(err)}`)
  }
}

const addSubTripFromSelect = async (event: Event) => {
  const childId = (event.target as HTMLSelectElement).value
  if (!childId) return
  try {
    await postWithToken(`/v1/dive-trips/${tripId()}/members/trips/${childId}`, {})
    await load({ showSpinner: false })
  } catch (err) {
    toast.error(`Could not add sub-trip: ${extractErrorDetail(err)}`)
  }
}

const removeTripMember = async (childTripId: number) => {
  try {
    await deleteWithToken(`/v1/dive-trips/${tripId()}/members/trips/${childTripId}`)
    await load({ showSpinner: false })
  } catch (err) {
    toast.error(`Failed to remove sub-trip: ${extractErrorDetail(err)}`)
  }
}

const removeRosterEntry = (idx: number) => {
  defaultTeamForm.value.splice(idx, 1)
  saveDefaultTeam()
}

// Auto-save, triggered on any roster row's blur/Enter/change - silent on success, loud on
// failure (same convention as saveDetails above).
const saveDefaultTeam = async () => {
  savingTeam.value = true
  try {
    await putWithToken(
      `/v1/dive-trips/${tripId()}/default-team`,
      defaultTeamForm.value
        .filter((e) => e.buddyUserId != null || e.buddyName.trim())
        .map((e) =>
          e.buddyUserId != null
            ? { buddyUserId: e.buddyUserId, role: e.role }
            : { buddyName: e.buddyName.trim(), role: e.role },
        ),
    )
  } catch (err) {
    toast.error(`Failed to save roster: ${extractErrorDetail(err)}`)
  } finally {
    savingTeam.value = false
  }
}

onMounted(load)
</script>
