<template>
  <div class="h-full p-4 flex justify-center items-center">
    <div
      class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-3xl w-full max-h-[90dvh] flex flex-col"
    >
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Edit Dive #{{ formData.diveNumber }}</h1>
        <button @click="safeBack" class="text-xl font-bold hover:text-gray-600">✕</button>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">Loading dive data...</p>
      </div>

      <div v-else-if="error" class="flex-1 flex items-center justify-center">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <div v-else class="flex-1 overflow-auto space-y-6">
        <EditDiveForm
          v-if="currentUserId && loadedDive"
          v-model="formData"
          :user-id="currentUserId"
          :existing-named-buddies="loadedDive?.namedBuddies"
          :existing-buddy-dives="loadedDive?.buddiesDives"
          :dive-start="loadedDive.summary.start"
          :profiles="loadedDive.profiles"
        >
          <!-- Tags — placed between Buddies and Notes via the form's slot -->
          <div class="border rounded p-4">
            <h3 class="font-medium mb-3">Tags</h3>

            <!-- Auto-detected tags -->
            <div v-if="activeAutoTags.length > 0" class="mb-3">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Auto-detected — click ✕ to dismiss
              </p>
              <div class="flex flex-wrap gap-1">
                <TagBadge
                  v-for="tag in activeAutoTags"
                  :key="tag.id"
                  :name="tag.name"
                  :auto-detected="true"
                  :removable="true"
                  @remove="dismissAutoTag(tag.id)"
                />
              </div>
            </div>

            <!-- Manual tags -->
            <TagSelector v-model="selectedTags" />
          </div>
        </EditDiveForm>
      </div>

      <div class="mt-6 pt-4 border-t flex justify-end gap-3">
        <button
          @click="safeBack"
          class="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {{ submitting ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { useNavigation } from '@/composables/useNavigation'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import EditDiveForm from '@/components/dive/edit/EditDiveForm.vue'
import type {
  Dive,
  DiveSite,
  Visibility,
  WaterType,
  Current,
  GasConsumption,
  DiveConfiguration,
  TagDefinition,
  TeamTerminology,
} from '@/lib/types/dive'
import type { EditableNamedBuddy } from '@/components/dive/edit/EditDiveForm.vue'
import type { User } from '@/lib/types/user'
import TagSelector from '@/components/dive/TagSelector.vue'
import TagBadge from '@/components/dive/TagBadge.vue'

const route = useRoute()
const router = useRouter()
const { safeBack } = useNavigation()
const { getWithToken, putWithToken, postWithToken } = useApi()
const { readOnly } = useReadOnlyMode()

const diveId = computed(() => Number(route.params.diveId))
const currentUserId = ref<number | null>(null)
const myUserId = ref<number | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)

/**
 * Fetches the current user's own ID. Returns whether the fetch succeeded so callers can
 * distinguish "we don't know the user's ID because this failed" from "we know it and it's
 * null" — conflating the two would make a transient network error look identical to "this
 * isn't your dive" in the ownership check that follows.
 */
const fetchMyUserId = async (): Promise<boolean> => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    myUserId.value = res.data.id
    return true
  } catch (err) {
    console.error('Failed to fetch user ID', err)
    return false
  }
}

interface DiveFormData {
  diveNumber?: number
  diveName?: string
  diveSite?: DiveSite | null
  diveBuddies?: EditableNamedBuddy[]
  notes?: string
  visibility?: Visibility | null
  waterType?: WaterType | null
  current?: Current | null
  gasConsumption?: GasConsumption | null
  configuration?: DiveConfiguration | null
  leaderNamedBuddyId?: number | null
  leaderBuddyDiveId?: number | null
  leaderSelfExplicit?: boolean
  teamTerminology?: TeamTerminology | null
  averageDepth?: number | null
}

const formData = ref<DiveFormData>({
  diveBuddies: [],
})

/** The dive as last fetched from the backend - kept around so the leader picker can offer only
 * already-persisted named buddies/linked dives (see EditDiveForm's own note on why). */
const loadedDive = ref<Dive | null>(null)

const selectedTags = ref<TagDefinition[]>([])
/** Auto-detected tags fetched fresh from the backend on load. */
const autoTags = ref<TagDefinition[]>([])
/** IDs of auto-detected tags the user has explicitly dismissed in this editing session. */
const dismissedAutoTagIds = ref<Set<number>>(new Set())

/** Auto-tags that are currently visible (not dismissed). */
const activeAutoTags = computed(() =>
  autoTags.value.filter((t) => !dismissedAutoTagIds.value.has(t.id)),
)

const dismissAutoTag = (id: number) => {
  dismissedAutoTagIds.value = new Set([...dismissedAutoTagIds.value, id])
}

const originalSite = ref<DiveSite | null>(null)

const fetchDive = async () => {
  loading.value = true
  error.value = null
  try {
    // POST /refresh-tags: refreshes auto-detected tags server-side and returns the
    // up-to-date dive in one round-trip, so the edit page always starts with current tags.
    const res = await postWithToken<Dive>(`/v1/dives/${diveId.value}/refresh-tags`, {})
    const dive = res.data

    // Editing isn't yours to do here - either this dive belongs to someone else (the backend
    // itself would reject any actual save, but bouncing back immediately is much clearer than an
    // edit form that silently can't be submitted), or read-only mode is on and nothing should be
    // editable right now regardless of ownership.
    if (dive.user.id !== myUserId.value || readOnly.value) {
      toast.error("You can't edit this dive right now.")
      router.replace({ name: 'DiveView', params: { diveId: diveId.value } })
      return
    }

    currentUserId.value = dive.user.id
    loadedDive.value = dive

    formData.value = {
      diveNumber: dive.number,
      diveName: dive.customIdentifier,
      diveSite: dive.site,
      diveBuddies: (dive.namedBuddies ?? []).map((b) => ({ name: b.name, role: b.role })),
      notes: dive.notes,
      visibility: dive.visibility,
      waterType: dive.waterType,
      current: dive.current,
      gasConsumption: dive.gasConsumption,
      configuration: dive.configuration,
      leaderNamedBuddyId: dive.leader.type === 'NAMED' ? dive.leader.namedBuddyId : null,
      leaderBuddyDiveId: dive.leader.type === 'LINKED' ? dive.leader.linkedDiveId : null,
      leaderSelfExplicit: dive.leader.type === 'SELF',
      teamTerminology: dive.teamTerminology,
      averageDepth: dive.summary.averageDepth,
    }
    // Smart default: this dive has no explicit terminology override of its own yet - prefill the
    // picker with the user's own most recent explicit choice (on some other dive) rather than
    // leaving it on a bare "Default (Buddy)". If the user saves without touching the picker, that
    // becomes this dive's own explicit choice too - same as any other prefilled form default.
    if (!dive.teamTerminology) {
      try {
        const defaultRes = await getWithToken<TeamTerminology | null>(
          '/v1/dives/team-terminology/default',
        )
        if (defaultRes.data) {
          formData.value.teamTerminology = defaultRes.data
        }
      } catch (err) {
        console.error('Failed to fetch terminology default', err)
      }
    }
    originalSite.value = dive.site
    // Split tags: manual ones go into the selector, auto-detected ones are shown separately
    selectedTags.value = (dive.tags ?? []).filter((t) => !t.autoDetectRule)
    autoTags.value = (dive.tags ?? []).filter((t) => !!t.autoDetectRule)
    dismissedAutoTagIds.value = new Set()
  } catch (err) {
    error.value = 'Could not load dive data.'
    console.error(err)
    toast.error(`Failed to load dive data: ${extractErrorDetail(err)}`)
  } finally {
    loading.value = false
  }
}

const siteHasChanged = (original: DiveSite | null, edited: DiveSite | null): boolean => {
  if (!original && !edited) return false
  if ((!original && edited) || (original && !edited)) return true
  return (
    original!.name !== edited!.name ||
    original!.latitude !== edited!.latitude ||
    original!.longitude !== edited!.longitude
  )
}

const tryCreateNewSite = async (
  newSite: DiveSite | null,
  lat: number,
  lon: number,
): Promise<DiveSite | null> => {
  const name = newSite?.name ?? ''
  if (!name) {
    toast.error('Dive Site name cannot be empty.')
    return null
  }
  try {
    const newSiteData = { name, lat, lon }
    const createdSite = await postWithToken<DiveSite>('/v1/dives/sites', newSiteData)
    const returned = createdSite.data
    if (!returned.id) {
      toast.error('Created dive site has no ID.')
      return null
    }
    return {
      id: returned.id,
      name: returned.name,
      latitude: returned.latitude,
      longitude: returned.longitude,
    }
  } catch (err) {
    console.error(err)
    toast.error(`Failed to create new dive site: ${extractErrorDetail(err)}`)
    return null
  }
}

const getSitePayload = async (
  original: DiveSite | null,
  newSite: DiveSite | null,
): Promise<DiveSite | null> => {
  if (siteHasChanged(original, newSite)) {
    const lat = newSite?.latitude ?? 0
    const lon = newSite?.longitude ?? 0

    // Check for existing sites
    let existingSites: DiveSite[] = []
    try {
      const res = await getWithToken<DiveSite[]>(`/v1/dives/sites/location?lat=${lat}&lon=${lon}`)
      existingSites = res.data
    } catch (err) {
      console.error(err)
      toast.error(`Failed to check for existing dive site: ${extractErrorDetail(err)}`)
      return null
    }

    if (existingSites.length > 0) {
      const existing = existingSites[0]!
      if (!existing.id) {
        toast.error('Existing dive site has no ID.')
        return null
      }
      return {
        id: existing.id,
        name: existing.name,
        latitude: existing.latitude,
        longitude: existing.longitude,
      }
    } else {
      return await tryCreateNewSite(newSite, lat, lon)
    }
  }
  return original
    ? {
        id: original.id!,
        name: original.name,
        latitude: original.latitude,
        longitude: original.longitude,
      }
    : null
}

/** Mirrors the backend's Gas invariant (O2 + He can't exceed 100%, since N2 is implied as the
 * remainder) so a bad cylinder mix is caught here, in the frontend, rather than only surfacing as
 * a 400 from the server after a round trip. */
const invalidCylinders = computed(
  () =>
    (formData.value.configuration?.cylinders ?? []).filter(
      (cylinder) => cylinder.gas.o2 + cylinder.gas.he > 1.001,
    ).length,
)

const handleSubmit = async () => {
  if (invalidCylinders.value > 0) {
    toast.error(
      `${invalidCylinders.value} cylinder${invalidCylinders.value === 1 ? '' : 's'} ` +
        `${invalidCylinders.value === 1 ? 'has' : 'have'} O2 + He over 100% - fix the gas mix` +
        ` before saving.`,
    )
    return
  }

  submitting.value = true
  const newSite = formData.value.diveSite ?? null

  const sitePayload = await getSitePayload(originalSite.value, newSite)

  if (!sitePayload) {
    toast.error('Dive site information is missing.')
    submitting.value = false
    return
  }

  // The backend's Gas record requires o2+n2+he+h2 to sum to 100% - the cylinder editor only ever
  // tracks/edits o2 and he (n2 is implied, see DiveConfigurationCylinder's own doc comment), so n2
  // has to be filled in here before sending or the backend's JSON deserialization rejects the
  // whole request (it has no way to infer n2 from a partial gas object itself).
  const configurationPayload = formData.value.configuration
    ? {
        ...formData.value.configuration,
        cylinders: (formData.value.configuration.cylinders ?? []).map((cylinder) => ({
          ...cylinder,
          gas: { ...cylinder.gas, n2: 1 - cylinder.gas.o2 - cylinder.gas.he, h2: 0 },
        })),
      }
    : null

  const payload = {
    id: diveId.value,
    number: formData.value.diveNumber ?? 1,
    customIdentifier: formData.value.diveName ?? null,
    siteId: sitePayload.id,
    namedBuddies: formData.value.diveBuddies ?? null,
    notes: formData.value.notes ?? null,
    visibility: formData.value.visibility ?? null,
    waterType: formData.value.waterType ?? null,
    current: formData.value.current ?? null,
    gasConsumption: formData.value.gasConsumption ?? null,
    configuration: configurationPayload,
    suitId: formData.value.configuration?.suit?.id ?? null,
    leaderNamedBuddyId: formData.value.leaderNamedBuddyId ?? null,
    leaderBuddyDiveId: formData.value.leaderBuddyDiveId ?? null,
    leaderSelfExplicit: formData.value.leaderSelfExplicit ?? false,
    teamTerminology: formData.value.teamTerminology ?? null,
    // Only meaningful (and only ever shown as editable) for a manual dive - backend ignores it
    // for a dive with a real computer profile. null means "leave whatever's already stored", not
    // "clear it" - same convention as notes/visibility above.
    averageDepth: formData.value.averageDepth ?? null,
  }

  try {
    await putWithToken('/v1/dives', payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    // Update tags: send manual tag IDs and explicitly dismissed auto-tag IDs
    const tagsBody = {
      manualTagIds: selectedTags.value.map((t) => t.id),
      dismissedAutoTagIds: [...dismissedAutoTagIds.value],
    }
    await putWithToken(`/v1/dives/${diveId.value}/tags`, tagsBody)
    toast.success('Dive updated successfully!')
    safeBack()
  } catch (err) {
    console.error(err)
    toast.error(`Failed to update dive: ${extractErrorDetail(err)}`, { duration: 10000 })
  } finally {
    submitting.value = false
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    if (!submitting.value) {
      handleSubmit()
    }
  }
}

onMounted(async () => {
  const myUserIdFetched = await fetchMyUserId()
  if (!myUserIdFetched) {
    // We couldn't even determine who the current user is, so the ownership check in
    // fetchDive() can't be trusted (myUserId.value would still be null, which would look
    // indistinguishable from "not your dive"). Surface this as a retry-able error instead of
    // bouncing the user away from their own dive.
    loading.value = false
    error.value = 'Could not verify your account. Please reload the page to try again.'
  } else {
    await fetchDive()
  }
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
