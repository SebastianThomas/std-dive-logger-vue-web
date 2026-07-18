<template>
  <div
    class="mb-4 p-3 md:p-4 border rounded-lg shadow-sm w-full max-w-250 mx-auto"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <div class="flex flex-col gap-3">
      <!-- Metrics toggles (collapsible) -->
      <div>
        <button
          class="text-sm font-semibold flex items-center gap-2"
          @click="showMetrics = !showMetrics"
        >
          <span :style="{ color: 'var(--foreground)' }">Metrics</span>
          <span class="fa-sm"
            ><i :class="showMetrics ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i
          ></span>
        </button>
      </div>
      <div v-show="showMetrics" class="flex flex-wrap gap-3 items-center">
        <span class="flex items-center gap-1.5">
          <span class="font-bold text-sm" style="color: #ffffff">Depth</span>
        </span>
        <StyledCheckbox
          :model-value="showTemp"
          color="#ef4444"
          :disabled="disableTemp"
          :title="disableTemp ? 'No temperature data' : ''"
          @update:model-value="$emit('update:showTemp', $event)"
        >
          <span class="font-bold text-sm" style="color: #ef4444">Temperature</span>
        </StyledCheckbox>
        <StyledCheckbox
          v-if="showSegmentsToggle !== false"
          :model-value="showSegments"
          color="var(--foreground)"
          @update:model-value="$emit('update:showSegments', $event)"
        >
          <span class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }"
            >Segments</span
          >
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showNdl"
          color="#7c3aed"
          :disabled="disableNdl"
          :title="disableNdl ? 'No NDL data' : ''"
          @update:model-value="$emit('update:showNdl', $event)"
        >
          <span class="font-bold text-sm" style="color: #7c3aed">NDL</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showOtu"
          color="#ec4899"
          :disabled="disableOtu"
          :title="disableOtu ? 'No OTU data' : ''"
          @update:model-value="$emit('update:showOtu', $event)"
        >
          <span class="font-bold text-sm" style="color: #ec4899">OTUs</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showCns"
          color="#fbbf24"
          :disabled="disableCns"
          :title="disableCns ? 'No CNS data' : ''"
          @update:model-value="$emit('update:showCns', $event)"
        >
          <span class="font-bold text-sm" style="color: #fbbf24">CNS</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showGf"
          color="#8b5cf6"
          :disabled="disableGf"
          :title="disableGf ? 'No GF99 data' : ''"
          @update:model-value="$emit('update:showGf', $event)"
        >
          <span class="font-bold text-sm" style="color: #8b5cf6">GF99</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showPo2Measured"
          color="#1d4ed8"
          :disabled="disablePo2Measured"
          :title="disablePo2Measured ? 'No PO2 measured data' : ''"
          @update:model-value="$emit('update:showPo2Measured', $event)"
        >
          <span class="font-bold text-sm" style="color: #1d4ed8">PO2 measured</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showPo2Calculated"
          color="#d946ef"
          :disabled="disablePo2Calculated"
          :title="disablePo2Calculated ? 'No PO2 calculated data' : ''"
          @update:model-value="$emit('update:showPo2Calculated', $event)"
        >
          <span class="font-bold text-sm" style="color: #d946ef">PO2 calculated</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showPo2Setpoint"
          color="#22c55e"
          :disabled="disablePo2Setpoint"
          :title="disablePo2Setpoint ? 'No PO2 setpoint data' : ''"
          @update:model-value="$emit('update:showPo2Setpoint', $event)"
        >
          <span class="font-bold text-sm" style="color: #22c55e">PO2 setpoint</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showRmv"
          color="#14b8a6"
          :disabled="disableRmv"
          :title="disableRmv ? 'No RMV data' : ''"
          @update:model-value="$emit('update:showRmv', $event)"
        >
          <span class="font-bold text-sm" style="color: #14b8a6">RMV</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showGasO2"
          color="#06b6d4"
          :disabled="disableGasO2"
          :title="disableGasO2 ? 'No Gas O2 data' : ''"
          @update:model-value="$emit('update:showGasO2', $event)"
        >
          <span class="font-bold text-sm" style="color: #06b6d4">Gas O2</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showGasN2"
          color="#84cc16"
          :disabled="disableGasN2"
          :title="disableGasN2 ? 'No Gas N2 data' : ''"
          @update:model-value="$emit('update:showGasN2', $event)"
        >
          <span class="font-bold text-sm" style="color: #84cc16">Gas N2</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showGasHe"
          color="#f97316"
          :disabled="disableGasHe"
          :title="disableGasHe ? 'No Gas He data' : ''"
          @update:model-value="$emit('update:showGasHe', $event)"
        >
          <span class="font-bold text-sm" style="color: #f97316">Gas He</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showGrid"
          color="var(--foreground)"
          @update:model-value="$emit('update:showGrid', $event)"
        >
          <span class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">Grid</span>
        </StyledCheckbox>
        <StyledCheckbox
          :model-value="showDecoZone"
          color="#dc2626"
          :disabled="disableDecoZone"
          :title="disableDecoZone ? 'No mandatory decompression stops' : ''"
          @update:model-value="$emit('update:showDecoZone', $event)"
        >
          <span class="font-bold text-sm" style="color: #dc2626">Deco Ceiling</span>
        </StyledCheckbox>
      </div>
    </div>
    <!-- Tooltip profile selector placed between Metrics and Axis sections -->
    <div v-if="profilesCount > 1" class="flex items-center gap-2 mt-3">
      <span class="text-sm font-semibold" :style="{ color: 'var(--foreground)' }"
        >Tooltip Profile:</span
      >
      <button
        v-for="idx in profilesCount"
        :key="idx"
        @click="
          (!props.visibleProfiles || props.visibleProfiles[idx - 1]) &&
          $emit('update:selectedProfiles', [idx - 1])
        "
        :disabled="props.visibleProfiles && !props.visibleProfiles[idx - 1]"
        :class="[
          'px-2 py-0.5 text-xs rounded border transition-colors',
          props.visibleProfiles && !props.visibleProfiles[idx - 1]
            ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700'
            : selectedProfiles.includes(idx - 1)
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
      >
        {{ idx }}
      </button>
      <button
        @click="
          $emit(
            'update:selectedProfiles',
            selectedProfiles.length === profilesCount
              ? [selectedProfiles[0] ?? 0]
              : Array.from({ length: profilesCount }, (_, i) => i),
          )
        "
        :class="[
          'px-2 py-0.5 text-xs rounded border transition-colors ml-2',
          selectedProfiles.length === profilesCount
            ? 'bg-green-500 text-white border-green-600'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
      >
        All
      </button>
    </div>
    <!-- Axis Selectors Row -->
    <div class="mt-3 pt-3 border-t" :style="{ borderColor: 'rgba(209,213,219,0.5)' }">
      <div class="flex items-center justify-between">
        <button class="text-sm font-semibold flex items-center gap-2" @click="showAxes = !showAxes">
          <span :style="{ color: 'var(--foreground)' }">Axis Selectors</span>
          <span class="fa-sm"
            ><i :class="showAxes ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i
          ></span>
        </button>
      </div>
      <div v-show="showAxes" class="flex flex-wrap gap-4 items-center mt-2">
        <div class="flex flex-wrap w-full items-center justify-between">
          <div class="flex items-center gap-2">
            <select
              :value="props.leftAxisMetric"
              @input="handleLeftAxisChange"
              class="border rounded px-2 py-1 text-sm"
              :style="{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--foreground)',
                borderColor: 'rgba(209,213,219,0.8)',
              }"
            >
              <option
                v-for="[metric, name] in Object.entries(metricDisplayNames)"
                :key="metric"
                :value="metric"
              >
                {{ name }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <select
              :value="props.rightAxisMetric"
              @input="handleRightAxisChange"
              class="border rounded px-2 py-1 text-sm"
              :style="{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--foreground)',
                borderColor: 'rgba(209,213,219,0.8)',
              }"
            >
              <option
                v-for="[metric, name] in Object.entries(metricDisplayNames)"
                :key="metric"
                :value="metric"
              >
                {{ name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { metricDisplayNames, type MetricType } from '@/lib/types/graph'
import { ref } from 'vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'

const props = defineProps<{
  selectedProfiles: number[]
  profilesCount: number
  visibleProfiles?: boolean[]
  showTemp: boolean
  showSegments: boolean
  showGrid: boolean
  showNdl: boolean
  showOtu: boolean
  showCns: boolean
  showGf: boolean
  showPo2Measured: boolean
  showPo2Calculated: boolean
  showPo2Setpoint: boolean
  showRmv: boolean
  showGasO2: boolean
  showGasN2: boolean
  showGasHe: boolean
  showDecoZone: boolean
  disableTemp?: boolean
  disableNdl?: boolean
  disableOtu?: boolean
  disableCns?: boolean
  disableGf?: boolean
  disablePo2Measured?: boolean
  disablePo2Calculated?: boolean
  disablePo2Setpoint?: boolean
  disableRmv?: boolean
  disableGasO2?: boolean
  disableGasN2?: boolean
  disableGasHe?: boolean
  disableDecoZone?: boolean
  showSegmentsToggle?: boolean
  leftAxisMetric?: MetricType
  rightAxisMetric?: MetricType
}>()

const emit = defineEmits<{
  'update:selectedProfiles': [value: number[]]
  'update:showTemp': [value: boolean]
  'update:showSegments': [value: boolean]
  'update:showGrid': [value: boolean]
  'update:showNdl': [value: boolean]
  'update:showOtu': [value: boolean]
  'update:showCns': [value: boolean]
  'update:showGf': [value: boolean]
  'update:showPo2Measured': [value: boolean]
  'update:showPo2Calculated': [value: boolean]
  'update:showPo2Setpoint': [value: boolean]
  'update:showRmv': [value: boolean]
  'update:showGasO2': [value: boolean]
  'update:showGasN2': [value: boolean]
  'update:showGasHe': [value: boolean]
  'update:showDecoZone': [value: boolean]
  'update:leftAxisMetric': [value: MetricType]
  'update:rightAxisMetric': [value: MetricType]
}>()

const showMetrics = ref(true)
const showAxes = ref(true)

function handleLeftAxisChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as MetricType
  emit('update:leftAxisMetric', value)
}

function handleRightAxisChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as MetricType
  emit('update:rightAxisMetric', value)
}
</script>
