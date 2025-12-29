<template>
  <div
    class="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white rounded-2xl p-6 max-w-4xl w-full">
      <h1 class="text-3xl font-bold mb-6">Analytics - Dive Segments</h1>
      <p class="text-gray-600 mb-4">Dive ID: {{ diveId }}</p>
      <!-- TODO: Implement segments analytics visualization -->
      <div class="text-center py-12 text-gray-400">
        <p>Segments Analytics - Coming Soon</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const diveId = computed(() => Number(route.params.diveId))
</script>
