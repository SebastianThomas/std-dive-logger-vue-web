<template>
  <div
    class="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white rounded-2xl p-6 max-w-4xl w-full">
      <h1 class="text-3xl font-bold mb-2">Analytics - Dive Depth</h1>
      <p class="text-gray-600 mb-6">
        Analytics for dive:
        <span class="font-semibold">{{ dive?.customIdentifier || diveId }}</span>
      </p>

      <div v-if="isLoading" class="text-center py-12">
        <p class="text-gray-600">Loading and preparing data...</p>
      </div>

      <div v-else-if="analytics" class="space-y-4">
        <VueJsonPretty :data="analytics" />
      </div>

      <div v-else class="text-center py-12">
        <p class="text-gray-600">No analytics data available</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import type { Dive, DiveDepthVariance } from '@/lib/types/dive'
import axios from 'axios'

const route = useRoute()
const { getWithToken } = useApi()

const diveId = computed(() => Number(route.params.diveId))
const dive = ref<{ id: number; customIdentifier: string } | null>(null)
const analytics = ref<DiveDepthVariance[] | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    const [diveRes, analyticsRes] = await Promise.all([
      getWithToken<Dive>(`/v1/dives/${diveId.value}`),
      getWithToken<DiveDepthVariance[]>(`/v1/dives/analytics/depth-variance?id=${diveId.value}`),
    ])
    dive.value = diveRes.data
    analytics.value = analyticsRes.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Axios Error while fetching data', err)
    } else {
      console.error('Error while fetching data', err)
    }
  } finally {
    isLoading.value = false
  }
})
</script>
