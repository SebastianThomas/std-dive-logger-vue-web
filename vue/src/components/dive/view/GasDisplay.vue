<template>
  <span class="group relative inline-block cursor-help">
    {{ o2Percent }}/{{ hePercent }}
    <span
      class="absolute top-full mt-1 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
    >
      <span class="block">O₂: {{ o2Percent }}%, N₂: {{ n2Percent }}%, He: {{ hePercent }}%</span>
      <span v-if="showDetails && gas.description" class="block">{{ gas.description }}</span>
      <span v-if="showDetails && gas.size" class="block">Size: {{ formatSize(gas.size) }}</span>
      <span v-if="showDetails && gas.content" class="block"
        >Content: {{ formatContent(gas.content) }}</span
      >
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Gas } from '@/lib/types/dive'

const props = withDefaults(defineProps<{ gas: Gas; showDetails?: boolean }>(), {
  showDetails: false,
})

const showDetails = computed(() => props.showDetails)

const o2Percent = computed(() => Math.round((props.gas?.o2 ?? 0) * 100))
const hePercent = computed(() => Math.round((props.gas?.he ?? 0) * 100))
const n2Percent = computed(() => Math.round((props.gas?.n2 ?? 0) * 100))

const formatSize = (size: Gas['size']) =>
  size?.unit === 'LITER' ? `${size.value} L` : `${size?.value} cuft`

const formatContent = (content: Gas['content']) =>
  content?.unit === 'BAR' ? `${content.value} bar` : `${content?.value} psi`
</script>
