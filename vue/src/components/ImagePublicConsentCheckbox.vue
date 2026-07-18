<template>
  <label class="consent-label">
    <input
      type="checkbox"
      class="consent-checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span>
      I understand this image will be stored on a public file host — anyone with the link can
      view it, whether or not they're logged in.
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.consent-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  margin-top: 12px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--foreground, #4b5563);
  opacity: 0.9;
}

[data-theme='dark'] .consent-label {
  color: var(--foreground, #d1d5db);
}

.consent-checkbox {
  margin-top: 2px;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: #3b82f6;
}
</style>
