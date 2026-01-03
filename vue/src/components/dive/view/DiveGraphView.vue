<template>
  <div class="w-full h-full flex flex-col">
    <MetricsControlPanel
      class="px-3 pt-3 shrink-0"
      v-model:show-temp="showTemp"
      v-model:show-segments="showSegments"
      v-model:show-ndl="showNdl"
      v-model:show-otu="showOtu"
      v-model:show-cns="showCns"
      v-model:show-gf="showGf"
      v-model:show-rmv="showRmv"
      v-model:show-gas-o2="showGasO2"
      v-model:show-gas-n2="showGasN2"
      v-model:show-gas-he="showGasHe"
      :disable-temp="!hasTemp"
      :disable-ndl="!hasNdl"
      :disable-otu="!hasOtu"
      :disable-cns="!hasCns"
      :disable-gf="!hasGf"
      :disable-rmv="!hasRmv"
      :disable-gas-o2="!hasGasO2"
      :disable-gas-n2="!hasGasN2"
      :disable-gas-he="!hasGasHe"
      :show-segments-toggle="showSegmentsToggle"
    />

    <div class="graph-area flex-1 relative p-3">
      <label v-if="showGridToggle" class="graph-grid-toggle">
        <input type="checkbox" class="w-4 h-4" :checked="showGrid" @change="showGrid = !showGrid" />
        <span>Show grid</span>
      </label>

      <DiveGraph
        :profiles="profiles"
        :dive-id="diveId"
        :show-temp="showTemp"
        :show-segments="showSegments"
        :show-grid="showGrid"
        :show-ndl="showNdl"
        :show-otu="showOtu"
        :show-cns="showCns"
        :show-gf="showGf"
        :show-rmv="showRmv"
        :show-gas-o2="showGasO2"
        :show-gas-n2="showGasN2"
        :show-gas-he="showGasHe"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import type { DiveProfile } from '@/lib/types/dive'

interface Props {
  profiles: DiveProfile[]
  diveId: number
  showSegmentsToggle?: boolean
  showGridToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSegmentsToggle: true,
  showGridToggle: true,
})

// All metrics state
const showTemp = ref(false)
const showSegments = ref(false)
const showNdl = ref(false)
const showOtu = ref(false)
const showCns = ref(false)
const showGf = ref(false)
const showRmv = ref(false)
const showGasO2 = ref(false)
const showGasN2 = ref(false)
const showGasHe = ref(false)
const showGrid = ref(false)

const measurements = computed(() => props.profiles.flatMap((p) => p.measurements))

// Availability flags based on profile data
const hasTemp = computed(() =>
  measurements.value.some((m) => m.measurement.temperature?.value !== undefined),
)
const hasNdl = computed(() => measurements.value.some((m) => !!m.measurement.ndl))
const hasOtu = computed(() => measurements.value.some((m) => m.measurement.o2Tox !== undefined))
const hasCns = computed(() => measurements.value.some((m) => m.measurement.cns !== undefined))
const hasGf = computed(() => measurements.value.some((m) => m.measurement.n2 !== undefined))
const hasRmv = computed(() => measurements.value.some((m) => m.measurement.rmvLiters !== undefined))
const hasGasO2 = computed(() => measurements.value.some((m) => m.measurement.gas?.o2 !== undefined))
const hasGasN2 = computed(() => measurements.value.some((m) => m.measurement.gas?.n2 !== undefined))
const hasGasHe = computed(() => measurements.value.some((m) => m.measurement.gas?.he !== undefined))
</script>

<style scoped>
.graph-area {
  position: relative;
}

.graph-grid-toggle {
  position: absolute;
  top: 0;
  right: 12px;
  z-index: 25;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--card-bg, #ffffff);
  color: var(--foreground, #111827);
  border: 1px solid rgba(209, 213, 219, 0.8);
  border-radius: 9999px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}

[data-theme='dark'] .graph-grid-toggle {
  border-color: #334155;
  background-color: var(--card-bg, #111827);
  color: var(--foreground, #e5e7eb);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
</style>
