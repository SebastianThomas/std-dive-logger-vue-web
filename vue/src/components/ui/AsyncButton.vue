<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :aria-busy="loading || undefined"
    :class="[base, variantClass, sizeClass, 'disabled:opacity-50 disabled:cursor-not-allowed']"
    @click="$emit('click', $event)"
  >
    <LoadingSpinner v-if="loading" :size="spinnerSize" />
    <span><slot>{{ displayLabel }}</slot></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

const props = withDefaults(
  defineProps<{
    /** Request in flight - disables the button and shows a spinner. */
    loading?: boolean
    /** Disabled for a reason other than loading. */
    disabled?: boolean
    /** Rendered when there's no default slot. */
    label?: string
    /** Rendered in place of `label` while `loading` (defaults to `label` + "…"). */
    loadingLabel?: string
    variant?: 'blue' | 'green' | 'emerald' | 'red' | 'amber' | 'neutral'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'blue', size: 'md', type: 'button' },
)

defineEmits<{ click: [e: MouseEvent] }>()

const displayLabel = computed(() =>
  props.loading ? (props.loadingLabel ?? (props.label ? `${props.label}…` : '')) : (props.label ?? ''),
)

const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors'

const sizeClass = computed(() => (props.size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'))
const spinnerSize = computed(() => (props.size === 'sm' ? 'xs' : 'sm'))

const variantClass = computed(
  () =>
    ({
      blue: 'bg-blue-600 text-white hover:bg-blue-700',
      green: 'bg-green-600 text-white hover:bg-green-700',
      emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
      red: 'bg-red-600 text-white hover:bg-red-700',
      amber: 'bg-amber-600 text-white hover:bg-amber-700',
      neutral:
        'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600',
    })[props.variant],
)
</script>
