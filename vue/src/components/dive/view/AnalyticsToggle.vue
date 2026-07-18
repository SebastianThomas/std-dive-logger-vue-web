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
    <StyledCheckbox
      :model-value="showSegments"
      color="#10b981"
      @update:model-value="$emit('update:showSegments', $event)"
    >
      <span>Segments</span>
    </StyledCheckbox>
  </div>
</template>

<script setup lang="ts">
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'

defineProps<{
  showSegments: boolean
}>()

defineEmits<{
  'update:showSegments': [value: boolean]
}>()
</script>
