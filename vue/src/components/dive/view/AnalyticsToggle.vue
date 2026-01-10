<template>
  <div
    class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <span class="opacity-80">Analytics:</span>
    <label class="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        class="w-4 h-4 checkbox-green"
        :checked="showSegments"
        @change="$emit('update:showSegments', !showSegments)"
      />
      <span>Segments</span>
    </label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showSegments: boolean
}>()

defineEmits<{
  'update:showSegments': [value: boolean]
}>()
</script>

<style scoped>
.checkbox-green {
  accent-color: #10b981;
}
</style>
