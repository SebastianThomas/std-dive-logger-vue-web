<template>
  <div
    class="absolute top-2 z-10 flex items-center gap-2 text-xs"
    :class="position === 'left' ? 'left-2' : 'right-24'"
    :style="{ color: 'var(--foreground)' }"
  >
    <span>{{ props.label }}:</span>
    <select
      :value="props.modelValue"
      @input="handleInput"
      class="border rounded px-1 py-0.5"
      :style="{
        backgroundColor: 'var(--card-bg)',
        color: 'var(--foreground)',
        borderColor: 'rgba(209,213,219,0.8)',
      }"
    >
      <option
        v-for="[metric, n] in Object.entries(metricDisplayNames)"
        :key="metric"
        :value="metric"
      >
        {{ n }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { metricDisplayNames, type MetricType } from '@/lib/types/graph'

interface Props {
  modelValue: MetricType
  label: string
  position: 'left' | 'right'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: MetricType]
}>()

function handleInput(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as MetricType
  emit('update:modelValue', value)
}
</script>
