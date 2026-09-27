<template>
  <div v-if="show" class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
    <h3 class="font-semibold mb-1">
      RMV per usage window
      <span class="font-normal text-gray-500 dark:text-gray-400"
        >· cylinders breathed together are summed</span
      >
    </h3>
    <div class="divide-y divide-gray-100 dark:divide-gray-700">
      <div
        v-for="(phase, idx) in phases"
        :key="idx"
        class="consumption-phase flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5"
      >
        <span class="font-semibold tabular-nums">{{ windowLabel(phase) }}</span>
        <span class="text-gray-400 dark:text-gray-500">&middot;</span>
        <span class="text-gray-600 dark:text-gray-400">
          {{ CYLINDER_ROLE_LABELS[phase.role] }}
          {{ phase.cylinderIndexes.length > 1 ? 'cylinders' : 'cylinder' }}
          {{ phase.cylinderIndexes.map((i) => `#${i + 1}`).join(' + ') }}
        </span>
        <template v-if="phase.consumedLiters != null && phase.missingLiters === 0">
          <span class="text-gray-400 dark:text-gray-500">&middot;</span>
          <span class="tabular-nums">{{ Math.round(phase.consumedLiters) }} l</span>
        </template>
        <span class="text-gray-400 dark:text-gray-500">&middot;</span>
        <span v-if="phase.rmvLiters != null" class="font-semibold tabular-nums"
          >{{ phase.rmvLiters.toFixed(1) }} l/min</span
        >
        <span v-else class="text-amber-700 phase-incomplete">
          no RMV - {{ phase.missingLiters }} of {{ phase.cylinderIndexes.length }} without
          start/end pressure or size
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CYLINDER_ROLE_LABELS, type CylinderContribution } from '@/lib/types/dive'
import {
  consumptionPhases,
  phasesAddInformation,
  type ConsumptionPhase,
} from '@/lib/dive/consumptionPhases'

const props = defineProps<{ contributions: CylinderContribution[] }>()

const phases = computed(() => consumptionPhases(props.contributions))
const show = computed(() => phasesAddInformation(phases.value))

const mmss = (ms: number | null): string => {
  if (ms == null) return '?'
  const totalSeconds = Math.round(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.trunc(totalSeconds / 60))}:${pad(totalSeconds % 60)}`
}

const windowLabel = (phase: ConsumptionPhase): string =>
  phase.coversWholeDive || phase.windows.length === 0
    ? 'Whole dive'
    : phase.windows.map((w) => `${mmss(w.start)}–${mmss(w.end)}`).join(', ')
</script>

<style scoped>
[data-theme='dark'] .phase-incomplete {
  color: rgb(252 211 77);
}
</style>
