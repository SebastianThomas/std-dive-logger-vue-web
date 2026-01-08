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
      v-model:show-po2-measured="showPo2Measured"
      v-model:show-po2-calculated="showPo2Calculated"
      v-model:show-po2-setpoint="showPo2Setpoint"
      v-model:show-rmv="showRmv"
      v-model:show-gas-o2="showGasO2"
      v-model:show-gas-n2="showGasN2"
      v-model:show-gas-he="showGasHe"
      :disable-temp="!hasTemp"
      :disable-ndl="!hasNdl"
      :disable-otu="!hasOtu"
      :disable-cns="!hasCns"
      :disable-gf="!hasGf"
      :disable-po2-measured="!hasPo2Measured"
      :disable-po2-calculated="!hasPo2Calculated"
      :disable-po2-setpoint="!hasPo2Setpoint"
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
        :show-po2-measured="showPo2Measured"
        :show-po2-calculated="showPo2Calculated"
        :show-po2-setpoint="showPo2Setpoint"
        :show-rmv="showRmv"
        :show-gas-o2="showGasO2"
        :show-gas-n2="showGasN2"
        :show-gas-he="showGasHe"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
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

const profilesRef = toRef(props, 'profiles')
const {
  showTemp,
  showSegments,
  showGrid,
  showNdl,
  showOtu,
  showCns,
  showGf,
  showPo2Measured,
  showPo2Calculated,
  showPo2Setpoint,
  showRmv,
  showGasO2,
  showGasN2,
  showGasHe,
  hasTemp,
  hasNdl,
  hasOtu,
  hasCns,
  hasGf,
  hasPo2Measured,
  hasPo2Calculated,
  hasPo2Setpoint,
  hasRmv,
  hasGasO2,
  hasGasN2,
  hasGasHe,
} = useDiveGraphMetrics(profilesRef)
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
