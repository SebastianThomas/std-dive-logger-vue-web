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
          <form class="grid grid-cols-1 md:grid-cols-3 gap-3" @submit.prevent="saveDetails">
            <div>
              <label class="block text-sm font-medium mb-1">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Type</label>
              <select v-model="form.type" class="w-full rounded border px-2 py-1.5 dark:bg-gray-700">
                <option value="TRIP">Trip</option>
                <option value="COURSE">Course</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Terminology</label>
              <select
                v-model="form.teamTerminology"
                class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
              >
                <option :value="null">Default (Buddy)</option>
                <option value="BUDDY">Buddy</option>
                <option value="TEAM">Team</option>
              </select>
            </div>
            <div class="md:col-span-3">
              <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white! rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>

        <!-- Members -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 class="text-lg font-semibold">Members</h2>

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
          <p v-else class="text-sm text-gray-400 italic">No members yet.</p>

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
          </div>
        </div>

        <!-- Default team roster -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-3">
          <h2 class="text-lg font-semibold">Default Team Roster</h2>
          <p class="text-xs text-gray-400">
            A prefill template - copied onto a dive's named buddies when it's added to this trip
            (only if the dive doesn't already have any). Edited normally per-dive from there.
          </p>
          <div v-for="(entry, idx) in defaultTeamForm" :key="idx" class="flex gap-2 items-center">
            <input
              v-if="entry.buddyUserId == null"
              v-model="entry.buddyName"
              type="text"
              placeholder="Buddy name"
              class="flex-1 rounded border px-2 py-1.5 dark:bg-gray-700"
            />
            <span v-else class="flex-1 px-2 py-1.5 text-sm">
              {{ entry.buddyName }} <span class="text-xs text-gray-400">(linked user)</span>
            </span>
            <select v-model="entry.role" class="rounded border px-2 py-1.5 dark:bg-gray-700">
              <option v-for="(label, key) in BUDDY_ROLE_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
            <button type="button" class="px-2 text-red-600 hover:text-red-800" @click="defaultTeamForm.splice(idx, 1)">
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
          <div>
            <button
              type="button"
              :disabled="savingTeam"
              class="px-4 py-1.5 bg-blue-600 text-white! rounded hover:bg-blue-700 disabled:opacity-50"
              @click="saveDefaultTeam"
            >
              {{ savingTeam ? 'Saving…' : 'Save Roster' }}
            </button>
          </div>
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
import {
  DIVE_TRIP_TYPE_LABELS,
  type DiveTrip,
  type DiveTripType,
  type DiveTripMember,
  type DiveTripDefaultTeamMember,
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

const addableTrips = computed(() =>
  allTrips.value.filter(
    (t) => t.id !== trip.value?.id && !members.value.some((m) => m.subTrip?.id === t.id),
  ),
)

const load = async () => {
  loading.value = true
  try {
    const [tripRes, membersRes, divesRes, allTripsRes] = await Promise.all([
      getWithToken<DiveTrip>(`/v1/dive-trips/${tripId()}`),
      getWithToken<DiveTripMember[]>(`/v1/dive-trips/${tripId()}/members`),
      getWithToken<PagedResult<BasicDiveInfo>>(`/v1/dive-trips/${tripId()}/dives?pageSize=200`),
      getWithToken<DiveTrip[]>('/v1/dive-trips'),
    ])
    trip.value = tripRes.data
    members.value = membersRes.data
    transitiveDives.value = divesRes.data.result
    transitiveDivesTotal.value = divesRes.data.totalElements
    allTrips.value = allTripsRes.data
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
    loading.value = false
  }
}

const saveDetails = async () => {
  try {
    const res = await putWithToken<DiveTrip>(`/v1/dive-trips/${tripId()}`, {
      name: form.value.name,
      type: form.value.type,
      teamTerminology: form.value.teamTerminology,
    })
    trip.value = res.data
    toast.success('Trip updated')
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
const searchDives = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!diveSearchQuery.value.trim()) {
      diveSearchResults.value = []
      return
    }
    try {
      const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(
        `/v1/dives/search?page=0&query=${encodeURIComponent(diveSearchQuery.value.trim())}`,
      )
      diveSearchResults.value = res.data.result
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
    await load()
  } catch (err) {
    toast.error(`Failed to add dive to trip: ${extractErrorDetail(err)}`)
  }
}

const removeDiveMember = async (diveId: number) => {
  try {
    await deleteWithToken(`/v1/dive-trips/${tripId()}/members/dives/${diveId}`)
    await load()
  } catch (err) {
    toast.error(`Failed to remove dive: ${extractErrorDetail(err)}`)
  }
}

const addSubTripFromSelect = async (event: Event) => {
  const childId = (event.target as HTMLSelectElement).value
  if (!childId) return
  try {
    await postWithToken(`/v1/dive-trips/${tripId()}/members/trips/${childId}`, {})
    await load()
  } catch (err) {
    toast.error(`Could not add sub-trip: ${extractErrorDetail(err)}`)
  }
}

const removeTripMember = async (childTripId: number) => {
  try {
    await deleteWithToken(`/v1/dive-trips/${tripId()}/members/trips/${childTripId}`)
    await load()
  } catch (err) {
    toast.error(`Failed to remove sub-trip: ${extractErrorDetail(err)}`)
  }
}

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
    toast.success('Default team roster saved')
  } catch (err) {
    toast.error(`Failed to save roster: ${extractErrorDetail(err)}`)
  } finally {
    savingTeam.value = false
  }
}

onMounted(load)
</script>
