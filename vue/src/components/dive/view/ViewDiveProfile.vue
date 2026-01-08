<template>
  <div class="w-full">
    <div class="flex justify-end px-4 mb-2 gap-2">
      <div
        v-if="profiles.length > 1"
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs"
        :style="{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--foreground)',
          borderColor: 'rgba(209,213,219,0.8)',
        }"
      >
        <span class="opacity-80">Profiles:</span>
        <label
          v-for="(profile, idx) in profiles"
          :key="profile.id"
          class="flex items-center gap-1.5 cursor-pointer"
        >
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="visibleProfiles[idx]"
            @change="toggleProfile(idx)"
          />
          <span>{{ idx + 1 }}</span>
        </label>
      </div>
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs"
        :style="{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--foreground)',
          borderColor: 'rgba(209,213,219,0.8)',
        }"
      >
        <span class="opacity-80">Analytics:</span>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="showSegments"
            @change="showSegments = !showSegments"
          />
          <span>Segments</span>
        </label>
      </div>
    </div>
    <MetricsControlPanel
      class="px-4 mb-2"
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
      :show-segments-toggle="false"
    />
    <div class="relative h-75">
      <label class="inline-grid-toggle">
        <input type="checkbox" class="w-4 h-4" :checked="showGrid" @change="showGrid = !showGrid" />
        <span>Show grid</span>
      </label>
      <DiveGraph
        :profiles="filteredProfiles"
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
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
import type { DiveProfile } from '@/lib/types/dive'
import { toRef, ref, computed, onMounted } from 'vue'

const props = defineProps<{ profiles: DiveProfile[]; diveId: number }>()

const visibleProfiles = ref<boolean[]>([])
const profilesRef = toRef(props, 'profiles')
const diveId = toRef(props, 'diveId')

const filteredProfiles = computed(() =>
  props.profiles.filter((_, idx) => visibleProfiles.value[idx]),
)

const toggleProfile = (idx: number) => {
  visibleProfiles.value[idx] = !visibleProfiles.value[idx]
}

onMounted(() => {
  // Initialize all profiles as visible
  visibleProfiles.value = props.profiles.map(() => true)
})
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
.inline-grid-toggle {
  position: absolute;
  top: -2.5rem;
  right: 12px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--card-bg, #ffffff);
  color: var(--foreground, #111827);
  border: 1px solid rgba(209, 213, 219, 0.8);
  border-radius: 9999px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
  font-size: 0.875rem;
}

[data-theme='dark'] .inline-grid-toggle {
  background-color: var(--card-bg, #111827);
  color: var(--foreground, #e5e7eb);
  border-color: #334155;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}
</style>
