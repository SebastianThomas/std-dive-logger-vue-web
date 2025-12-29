<template>
  <div class="graph-modal-overlay">
    <div class="graph-modal-card">
      <button class="close-btn" @click="emit('close')">Close</button>
      <MetricsControlPanel
        class="px-3 pt-3"
        v-model:show-temp="showTempLocal"
        v-model:show-segments="showSegmentsLocal"
        v-model:show-ndl="showNdlLocal"
        v-model:show-otu="showOtuLocal"
        v-model:show-cns="showCnsLocal"
        v-model:show-gf="showGfLocal"
        v-model:show-rmv="showRmvLocal"
        v-model:show-gas-o2="showGasO2Local"
        v-model:show-gas-n2="showGasN2Local"
        v-model:show-gas-he="showGasHeLocal"
        :disable-temp="!hasTemp"
        :disable-ndl="!hasNdl"
        :disable-otu="!hasOtu"
        :disable-cns="!hasCns"
        :disable-gf="!hasGf"
        :disable-rmv="!hasRmv"
        :disable-gas-o2="!hasGasO2"
        :disable-gas-n2="!hasGasN2"
        :disable-gas-he="!hasGasHe"
      />
      <div class="graph-area">
        <label class="graph-grid-toggle">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showGrid"
            @change="emit('update:showGrid', !showGrid)"
          />
          <span>Show grid</span>
        </label>
        <DiveGraph
          :profile="profile"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import type { DiveProfile } from '@/lib/types/dive'

type Props = {
  profile: DiveProfile
  diveId: number
  showTemp: boolean
  showSegments: boolean
  showGrid: boolean
  showNdl: boolean
  showOtu: boolean
  showCns: boolean
  showGf: boolean
  showRmv: boolean
  showGasO2: boolean
  showGasN2: boolean
  showGasHe: boolean
}

const props = defineProps<Props>()
const emit = defineEmits([
  'close',
  'update:showTemp',
  'update:showSegments',
  'update:showGrid',
  'update:showNdl',
  'update:showOtu',
  'update:showCns',
  'update:showGf',
  'update:showRmv',
  'update:showGasO2',
  'update:showGasN2',
  'update:showGasHe',
])

const showTempLocal = computed({
  get: () => props.showTemp,
  set: (v: boolean) => emit('update:showTemp', v),
})
const showSegmentsLocal = computed({
  get: () => props.showSegments,
  set: (v: boolean) => emit('update:showSegments', v),
})
const showNdlLocal = computed({ get: () => props.showNdl, set: (v: boolean) => emit('update:showNdl', v) })
const showOtuLocal = computed({ get: () => props.showOtu, set: (v: boolean) => emit('update:showOtu', v) })
const showCnsLocal = computed({ get: () => props.showCns, set: (v: boolean) => emit('update:showCns', v) })
const showGfLocal = computed({ get: () => props.showGf, set: (v: boolean) => emit('update:showGf', v) })
const showRmvLocal = computed({ get: () => props.showRmv, set: (v: boolean) => emit('update:showRmv', v) })
const showGasO2Local = computed({ get: () => props.showGasO2, set: (v: boolean) => emit('update:showGasO2', v) })
const showGasN2Local = computed({ get: () => props.showGasN2, set: (v: boolean) => emit('update:showGasN2', v) })
const showGasHeLocal = computed({ get: () => props.showGasHe, set: (v: boolean) => emit('update:showGasHe', v) })

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

// Availability flags based on the provided profile data
const measurements = computed(() => props.profile.measurements)
const hasTemp = computed(() => measurements.value.some(m => m.measurement.temperature?.value !== undefined))
const hasNdl = computed(() => measurements.value.some(m => !!m.measurement.ndl))
const hasOtu = computed(() => measurements.value.some(m => m.measurement.o2Tox !== undefined))
const hasCns = computed(() => measurements.value.some(m => m.measurement.cns !== undefined))
const hasGf = computed(() => measurements.value.some(m => m.measurement.n2 !== undefined))
const hasRmv = computed(() => measurements.value.some(m => m.measurement.rmvLiters !== undefined))
const hasGasO2 = computed(() => measurements.value.some(m => m.measurement.gas?.o2 !== undefined))
const hasGasN2 = computed(() => measurements.value.some(m => m.measurement.gas?.n2 !== undefined))
const hasGasHe = computed(() => measurements.value.some(m => m.measurement.gas?.he !== undefined))

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.graph-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.graph-modal-card {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 30;
  padding: 8px 12px;
  font-size: 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.graph-area {
  position: relative;
  flex: 1;
  padding: 12px;
}

.graph-grid-toggle {
  position: absolute;
  top: -2.5rem;
  right: 16px;
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

[data-theme='dark'] .graph-modal-card {
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

[data-theme='dark'] .graph-grid-toggle {
  border-color: #334155;
  background-color: var(--card-bg, #111827);
  color: var(--foreground, #e5e7eb);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
</style>
