<template>
  <div class="popup-container">
    <h3 class="font-bold">{{ site.name }}</h3>
    <div class="dives-scroll-container">
      <ul class="space-y-1">
        <li v-for="info in sortedDiveInfo" :key="info.id" class="flex items-center justify-between">
          <span class="dive-name-truncate">#{{ info.number }}: {{ info.customIdentifier }}</span>
          <router-link
            :to="`/dives/view/${info.id}`"
            class="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 inline-block"
          >
            View Dive
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiveSite } from '@/lib/types/dive'
import { computed } from 'vue'

interface DiveInfo {
  id: number
  number: number
  customIdentifier: string
}

interface Props {
  site: DiveSite
  diveInfo: DiveInfo[]
}

const props = defineProps<Props>()

const sortedDiveInfo = computed(() => {
  return [...props.diveInfo].sort((a, b) => a.number - b.number)
})
</script>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  max-height: 150px;
  min-width: 200px;
}

.dives-scroll-container {
  overflow-y: auto;
  margin-top: 8px;
}

.dive-name-truncate {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}
</style>
