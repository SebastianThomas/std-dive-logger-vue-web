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
      <option v-for="[metric, n] in Object.entries(metricNames)" :key="metric" :value="metric">
        {{ n }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
export type AxisMetric =
  | 'depth'
  | 'temp'
  | 'ndl'
  | 'otu'
  | 'cns'
  | 'gf'
  | 'po2Measured'
  | 'po2Calculated'
  | 'po2Setpoint'
  | 'rmv'
  | 'gasO2'
  | 'gasN2'
  | 'gasHe'

const metricNames: Record<AxisMetric, string> = {
  depth: `Depth`,
  temp: `Temp`,
  ndl: `NDL`,
  otu: `OTUs`,
  cns: `CNS`,
  gf: `GF99`,
  po2Measured: `PO₂ measured`,
  po2Calculated: `PO₂ calculated`,
  po2Setpoint: `PO₂ setpoint`,
  rmv: `RMV`,
  gasO2: `Gas O₂`,
  gasN2: `Gas N₂`,
  gasHe: `Gas He`,
}

interface Props {
  modelValue: AxisMetric
  label: string
  position: 'left' | 'right'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: AxisMetric]
}>()

function handleInput(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as AxisMetric
  emit('update:modelValue', value)
}
</script>
