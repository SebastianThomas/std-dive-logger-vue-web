<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full">
      <h1 class="text-2xl font-bold mb-6">Analytics</h1>

      <div class="space-y-6">
        <section>
          <h2 class="text-lg font-semibold mb-4">Select Analytics View</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Choose an analytics view to visualize dive data. Enter a dive ID to view specific
            analytics.
          </p>

          <div class="space-y-4">
            <div>
              <label for="diveId" class="block mb-2 font-medium">Dive ID:</label>
              <input
                id="diveId"
                v-model.number="diveId"
                type="number"
                min="1"
                placeholder="Enter dive ID"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <router-link
                v-if="diveId"
                :to="{ name: 'AnalyticsDepth', params: { diveId } }"
                class="block"
              >
                <div
                  class="p-6 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <h3 class="text-lg font-semibold mb-2">Depth Analytics</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    View depth distribution and statistics for the dive.
                  </p>
                </div>
              </router-link>
              <div
                v-else
                class="p-6 border border-gray-300 dark:border-gray-600 rounded-lg opacity-50 cursor-not-allowed"
              >
                <h3 class="text-lg font-semibold mb-2">Depth Analytics</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  View depth distribution and statistics for the dive.
                </p>
              </div>

              <router-link
                v-if="diveId"
                :to="{ name: 'AnalyticsSegments', params: { diveId } }"
                class="block"
              >
                <div
                  class="p-6 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <h3 class="text-lg font-semibold mb-2">Segments Analytics</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    View dive segments and their characteristics.
                  </p>
                </div>
              </router-link>
              <div
                v-else
                class="p-6 border border-gray-300 dark:border-gray-600 rounded-lg opacity-50 cursor-not-allowed"
              >
                <h3 class="text-lg font-semibold mb-2">Segments Analytics</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  View dive segments and their characteristics.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const diveId = ref<number | null>(null)

// Initialize from query parameter
onMounted(() => {
  const queryDiveId = route.query.diveId
  if (queryDiveId && typeof queryDiveId === 'string') {
    const parsed = parseInt(queryDiveId, 10)
    if (!isNaN(parsed) && parsed > 0) {
      diveId.value = parsed
    }
  }
})

// Update query parameter when diveId changes
watch(diveId, (newValue) => {
  const query = newValue ? { diveId: newValue.toString() } : {}
  router.replace({ query })
})
</script>
