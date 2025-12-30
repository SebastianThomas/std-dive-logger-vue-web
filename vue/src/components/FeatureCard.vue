<template>
  <div
    class="w-full sm:min-w-75 sm:max-w-87.5 md:min-w-100 md:max-w-105 bg-white rounded-xl shadow-lg p-6 sm:p-8 shrink-0"
  >
    <div class="w-full h-40 sm:h-44 md:h-48 overflow-hidden rounded-md mb-4">
      <img
        :src="feature.image"
        :alt="feature.title"
        class="w-full h-full object-cover"
        width="356"
        height="192"
      />
    </div>
    <h3 class="text-lg font-semibold mb-2 text-gray-600">{{ feature.title }}</h3>
    <p class="text-gray-600 text-sm">{{ feature.description }}</p>
  </div>
</template>

<script setup lang="ts">
import { type FeatureCardProps } from '@/lib/types/feature'

defineProps<{
  feature: FeatureCardProps
}>()
</script>
