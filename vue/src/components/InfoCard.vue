<template>
  <div class="dive-card bg-white bg-opacity-90 rounded-xl shadow-md px-3 py-2 flex flex-col items-center min-w-30">
    <p class="text-xs" :style="{ color: 'var(--foreground)', opacity: 0.8 }">{{ title }}</p>
    <div v-if="value !== undefined" class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">
      {{ value }}
    </div>
    <div v-else class="space-y-1 text-xs text-gray-600">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  value?: string | number
}

defineProps<Props>()
</script>
