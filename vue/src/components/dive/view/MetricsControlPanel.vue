<template>
  <div
    class="mb-4 p-3 md:p-4 border rounded-lg shadow-sm w-full max-w-250 mx-auto"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <div class="flex flex-wrap gap-4 items-center">
      <!-- Metrics toggles -->
      <div class="flex flex-wrap gap-3 items-center">
        <span class="text-sm font-semibold" :style="{ color: 'var(--foreground)' }">Metrics:</span>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked disabled class="w-4 h-4" />
          <span class="font-bold text-sm" style="color: #ffffff">Depth</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showTemp"
            :disabled="disableTemp"
            :title="disableTemp ? 'No temperature data' : ''"
            @change="$emit('update:showTemp', !showTemp)"
          />
          <span class="font-bold text-sm" style="color: #ef4444">Temperature</span>
        </label>
        <label v-if="showSegmentsToggle !== false" class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showSegments"
            @change="$emit('update:showSegments', !showSegments)"
          />
          <span class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }"
            >Segments</span
          >
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showNdl"
            :disabled="disableNdl"
            :title="disableNdl ? 'No NDL data' : ''"
            @change="$emit('update:showNdl', !showNdl)"
          />
          <span class="font-bold text-sm" style="color: #7c3aed">NDL</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showOtu"
            :disabled="disableOtu"
            :title="disableOtu ? 'No OTU data' : ''"
            @change="$emit('update:showOtu', !showOtu)"
          />
          <span class="font-bold text-sm" style="color: #ec4899">OTUs</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showCns"
            :disabled="disableCns"
            :title="disableCns ? 'No CNS data' : ''"
            @change="$emit('update:showCns', !showCns)"
          />
          <span class="font-bold text-sm" style="color: #fbbf24">CNS</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGf"
            :disabled="disableGf"
            :title="disableGf ? 'No GF99 data' : ''"
            @change="$emit('update:showGf', !showGf)"
          />
          <span class="font-bold text-sm" style="color: #8b5cf6">GF99</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showRmv"
            :disabled="disableRmv"
            :title="disableRmv ? 'No RMV data' : ''"
            @change="$emit('update:showRmv', !showRmv)"
          />
          <span class="font-bold text-sm" style="color: #14b8a6">RMV</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGasO2"
            :disabled="disableGasO2"
            :title="disableGasO2 ? 'No Gas O₂ data' : ''"
            @change="$emit('update:showGasO2', !showGasO2)"
          />
          <span class="font-bold text-sm" style="color: #06b6d4">Gas O₂</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGasN2"
            :disabled="disableGasN2"
            :title="disableGasN2 ? 'No Gas N₂ data' : ''"
            @change="$emit('update:showGasN2', !showGasN2)"
          />
          <span class="font-bold text-sm" style="color: #84cc16">Gas N₂</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGasHe"
            :disabled="disableGasHe"
            :title="disableGasHe ? 'No Gas He data' : ''"
            @change="$emit('update:showGasHe', !showGasHe)"
          />
          <span class="font-bold text-sm" style="color: #f97316">Gas He</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showTemp: boolean
  showSegments: boolean
  showNdl: boolean
  showOtu: boolean
  showCns: boolean
  showGf: boolean
  showRmv: boolean
  showGasO2: boolean
  showGasN2: boolean
  showGasHe: boolean
  disableTemp?: boolean
  disableNdl?: boolean
  disableOtu?: boolean
  disableCns?: boolean
  disableGf?: boolean
  disableRmv?: boolean
  disableGasO2?: boolean
  disableGasN2?: boolean
  disableGasHe?: boolean
  showSegmentsToggle?: boolean
}>()
defineEmits<{
  'update:showTemp': [value: boolean]
  'update:showSegments': [value: boolean]
  'update:showNdl': [value: boolean]
  'update:showOtu': [value: boolean]
  'update:showCns': [value: boolean]
  'update:showGf': [value: boolean]
  'update:showRmv': [value: boolean]
  'update:showGasO2': [value: boolean]
  'update:showGasN2': [value: boolean]
  'update:showGasHe': [value: boolean]
}>()
</script>

<style scoped>
label input:disabled + span {
  opacity: 0.5;
}
</style>
