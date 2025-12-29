<template>
  <div class="bg-gray-900 min-h-screen p-4 flex justify-center items-center">
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
      <h1 class="text-2xl font-bold mb-6">Edit Dive</h1>
      <p class="text-gray-600 mb-4">Dive ID: {{ diveId }}</p>
      <!-- TODO: Implement EditDive component from Next.js -->
      <div class="text-center py-12 text-gray-400">
        <p>Edit Dive Form - Coming Soon</p>
      </div>
      <div class="flex gap-2 justify-end mt-6">
        <RouterLink :to="{ name: 'DiveView', params: { diveId } }">
          <button class="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Close</button>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const diveId = computed(() => Number(route.params.diveId))
</script>
