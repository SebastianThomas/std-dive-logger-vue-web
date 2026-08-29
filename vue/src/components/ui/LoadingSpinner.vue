<template>
  <span
    class="inline-block animate-spin leading-none"
    :class="sizeClass"
    role="status"
    aria-label="Loading"
  >
    <i class="fa-solid fa-circle-notch"></i>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' })

const sizeClass = computed(
  () => ({ xs: 'text-[10px]', sm: 'text-xs', md: 'text-sm' })[props.size],
)
</script>
