<template>
  <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 md:p-4">
    <div class="flex items-center gap-2 md:gap-3">
      <div class="text-lg md:text-2xl text-blue-600 dark:text-blue-400">
        <i :class="`fas fa-${icon}`"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">{{ label }}</p>
        <p class="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{{ value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: string
  icon: string
}

defineProps<Props>()
</script>
