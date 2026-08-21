<template>
  <div v-if="trips.length" class="flex flex-wrap gap-2 px-1">
    <router-link
      v-for="trip in trips"
      :key="trip.id"
      :to="{ name: 'TripEdit', params: { tripId: String(trip.id) } }"
      class="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200 hover:opacity-80"
    >
      <i class="fas fa-compass mr-1"></i>{{ trip.name }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import type { DiveTrip } from '@/lib/types/trip'

const props = defineProps<{ diveId: number }>()
const { getWithToken } = useApi()

const trips = ref<DiveTrip[]>([])

const load = async () => {
  try {
    const res = await getWithToken<DiveTrip[]>(`/v1/dive-trips/for-dive/${props.diveId}`)
    trips.value = res.data
  } catch {
    trips.value = []
  }
}

onMounted(load)
watch(() => props.diveId, load)
</script>
