<template>
  <div
    class="mb-4 p-3 md:p-4 border border-gray-300 rounded-lg bg-gray-50 shadow-sm w-full max-w-250 mx-auto"
  >
    <div class="flex flex-wrap gap-4 items-center">
      <!-- Metrics toggles -->
      <div class="flex flex-wrap gap-3 items-center">
        <span class="text-sm font-semibold text-gray-800">Metrics:</span>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked disabled class="w-4 h-4" />
          <span class="font-bold text-sm" style="color: #2563eb">Depth</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showTemp"
            @change="$emit('update:showTemp', !showTemp)"
          />
          <span class="font-bold text-sm" style="color: #ef4444">Temperature</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showSegments"
            @change="$emit('update:showSegments', !showSegments)"
          />
          <span class="font-semibold text-sm text-gray-700">Segments</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGrid"
            @change="$emit('update:showGrid', !showGrid)"
          />
          <span class="text-sm text-gray-700">Grid</span>
        </label>
      </div>

      <!-- Unported metrics notice -->
      <div class="flex flex-wrap gap-2 text-xs text-gray-500">
        <span class="font-semibold">Coming soon:</span>
        <span>OTUs</span>
        <span>CNS</span>
        <span>NDL</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ showTemp: boolean; showSegments: boolean; showGrid: boolean }>()
defineEmits<{
  'update:showTemp': []
  'update:showSegments': []
  'update:showGrid': []
}>()
</script>

<style scoped></style>
