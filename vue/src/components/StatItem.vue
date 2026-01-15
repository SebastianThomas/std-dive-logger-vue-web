<template>
  <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
    <div class="flex items-center gap-3">
      <div class="text-2xl text-blue-600 dark:text-blue-400">
        <i :class="`fas fa-${icon}`"></i>
      </div>
      <div class="flex-1">
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ label }}</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ value }}</p>
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
