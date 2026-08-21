<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-2xl space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-bold">Dive Trips</h1>
        </div>

        <form class="flex gap-2 mb-4" @submit.prevent="create">
          <input
            v-model="newName"
            type="text"
            placeholder="Trip or course name"
            class="flex-1 rounded border px-2 py-1.5 dark:bg-gray-700"
            required
          />
          <select v-model="newType" class="rounded border px-2 py-1.5 dark:bg-gray-700">
            <option value="TRIP">Trip</option>
            <option value="COURSE">Course</option>
          </select>
          <button
            type="submit"
            :disabled="creating"
            class="px-4 py-1.5 bg-blue-600 text-white! rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </form>

        <div v-if="loading" class="text-center text-gray-400 py-8">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <ul v-else-if="trips.length" class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="trip in trips" :key="trip.id" class="py-3">
            <router-link
              :to="{ name: 'TripEdit', params: { tripId: String(trip.id) } }"
              class="flex items-center justify-between hover:text-blue-600"
            >
              <span class="font-medium">{{ trip.name }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="
                  trip.type === 'COURSE'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
                    : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
                "
              >
                {{ DIVE_TRIP_TYPE_LABELS[trip.type] }}
              </span>
            </router-link>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-400 italic py-8 text-center">
          No trips yet. Create one above - trips can contain dives and other trips (for nested
          groups, e.g. a season containing multiple holidays/courses).
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { toast } from 'vue-sonner'
import { DIVE_TRIP_TYPE_LABELS, type DiveTrip, type DiveTripType } from '@/lib/types/trip'

const { getWithToken, postWithToken } = useApi()

const trips = ref<DiveTrip[]>([])
const loading = ref(true)
const creating = ref(false)
const newName = ref('')
const newType = ref<DiveTripType>('TRIP')

const load = async () => {
  loading.value = true
  try {
    const res = await getWithToken<DiveTrip[]>('/v1/dive-trips')
    trips.value = res.data
  } catch {
    toast.error('Failed to load trips')
  } finally {
    loading.value = false
  }
}

const create = async () => {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await postWithToken<DiveTrip>('/v1/dive-trips', { name: newName.value.trim(), type: newType.value })
    newName.value = ''
    await load()
  } catch {
    toast.error('Failed to create trip')
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>
