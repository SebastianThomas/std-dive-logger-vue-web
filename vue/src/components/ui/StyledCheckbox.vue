<template>
  <label
    class="inline-flex items-center gap-1.5 select-none py-1.5 -my-1.5"
    :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
    :title="title"
  >
    <span class="relative inline-flex w-4 h-4 shrink-0">
      <input
        type="checkbox"
        class="peer sr-only"
        :checked="modelValue"
        :disabled="disabled"
        @click="$emit('click', $event)"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        class="pointer-events-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-blue-400"
        :style="{
          borderColor: color,
          backgroundColor: modelValue ? color : 'transparent',
        }"
      >
        <svg v-show="modelValue" viewBox="0 0 16 16" class="w-2.5 h-2.5" fill="none">
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="white"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </span>
    <slot />
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  color?: string
  disabled?: boolean
  title?: string
}

withDefaults(defineProps<Props>(), {
  color: '#3b82f6',
  disabled: false,
  title: '',
})

defineEmits<{
  'update:modelValue': [value: boolean]
  click: [event: MouseEvent]
}>()
</script>
