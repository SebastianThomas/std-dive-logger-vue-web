<template>
  <StyledCheckbox
    class="consent-label"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <span>
      I understand this image will be stored on a public file host — anyone with the link can
      view it, whether or not they're logged in.
    </span>
  </StyledCheckbox>
</template>

<script setup lang="ts">
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'

defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.consent-label {
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--foreground, #4b5563);
  opacity: 0.9;
}

[data-theme='dark'] .consent-label {
  color: var(--foreground, #d1d5db);
}
</style>
