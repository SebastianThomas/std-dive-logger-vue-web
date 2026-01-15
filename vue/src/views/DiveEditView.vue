<template>
  <div class="min-h-screen p-4 flex justify-center items-center">
    <div
      class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-3xl w-full max-h-[90vh] flex flex-col"
    >
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Edit Dive #{{ formData.diveNumber }}</h1>
        <button @click="goBack" class="text-xl font-bold hover:text-gray-600">✕</button>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <p class="text-gray-500">Loading dive data...</p>
      </div>

      <div v-else-if="error" class="flex-1 flex items-center justify-center">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <div v-else class="flex-1 overflow-auto">
        <EditDiveForm v-model="formData" />
      </div>

      <div class="mt-6 pt-4 border-t flex justify-end gap-3">
        <button
          @click="goBack"
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
import EditDiveForm from '@/components/dive/edit/EditDiveForm.vue'
import type {
  Dive,
  DiveSite,
  Visibility,
  GasConsumption,
  DiveConfiguration,
} from '@/lib/types/dive'

const route = useRoute()
const router = useRouter()
const { getWithToken, putWithToken, postWithToken } = useApi()

const diveId = computed(() => Number(route.params.diveId))
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)

interface DiveFormData {
  diveNumber?: number
  diveName?: string
  diveSite?: DiveSite | null
  diveBuddies?: string[]
  notes?: string
  visibility?: Visibility | null
  gasConsumption?: GasConsumption | null
  configuration?: DiveConfiguration | null
}

const formData = ref<DiveFormData>({
  diveBuddies: [],
})

const originalSite = ref<DiveSite | null>(null)

const goBack = () => router.push({ name: 'DiveView', params: { diveId: diveId.value } })

const fetchDive = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<Dive>(`/v1/dives/${diveId.value}`)
    const dive = res.data

    formData.value = {
      diveNumber: dive.number,
      diveName: dive.customIdentifier,
      diveSite: dive.site,
      diveBuddies: dive.namedBuddies ?? [],
      notes: dive.notes,
      visibility: dive.visibility,
      gasConsumption: dive.gasConsumption,
      configuration: dive.configuration,
    }
    originalSite.value = dive.site
  } catch (err) {
    error.value = 'Could not load dive data.'
    console.error(err)
    toast.error('Failed to load dive data')
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
    toast.error('Failed to create new dive site.')
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
      toast.error('Failed to check for existing dive site.')
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

const handleSubmit = async () => {
  submitting.value = true
  const newSite = formData.value.diveSite ?? null

  const sitePayload = await getSitePayload(originalSite.value, newSite)

  if (!sitePayload) {
    toast.error('Dive site information is missing.')
    submitting.value = false
    return
  }

  const payload = {
    id: diveId.value,
    number: formData.value.diveNumber ?? 1,
    customIdentifier: formData.value.diveName ?? null,
    siteId: sitePayload.id,
    namedBuddies: formData.value.diveBuddies ?? null,
    notes: formData.value.notes ?? null,
    visibility: formData.value.visibility ?? null,
    gasConsumption: formData.value.gasConsumption ?? null,
    configuration: formData.value.configuration ?? null,
  }

  try {
    await putWithToken('/v1/dives', payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    toast.success('Dive updated successfully!')
    goBack()
  } catch (err) {
    console.error(err)
    toast.error('Failed to update dive.')
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

onMounted(() => {
  fetchDive()
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
