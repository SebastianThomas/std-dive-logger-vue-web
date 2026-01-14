<template>
  <div v-if="fullscreen" class="graph-modal-overlay">
    <div class="graph-modal-card fullscreen">
      <div class="w-full h-full flex flex-col overflow-hidden">
        <!-- Header with responsive layout -->
        <div class="px-3 pt-3 pb-0 shrink-0">
          <!-- Controls row - always visible -->
          <div class="flex justify-center mb-3">
            <FullscreenGraphControls
              :profiles="profiles"
              :visible-profiles="visibleProfiles"
              v-model:show-segments="showSegments"
              @close="handleClose"
              @toggle-profile="toggleProfile"
            />
          </div>

          <!-- Grid layout for larger screens, single column for small -->
          <div class="grid grid-cols-1 xl:grid-cols-[minmax(200px,1fr)_auto_1fr] gap-4">
            <!-- Left column: Empty spacer (hidden on small screens) -->
            <div class="hidden xl:block"></div>

            <!-- Center column: MetricsControlPanel -->
            <div>
              <MetricsControlPanel
                v-model:selected-profiles="selectedProfiles"
                :profiles-count="profiles.length"
                v-model:show-temp="showTemp"
                v-model:show-segments="showSegments"
                v-model:show-grid="showGrid"
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
                :disable-temp="!combinedMetricsAvailability.hasTemp"
                :disable-ndl="!combinedMetricsAvailability.hasNdl"
                :disable-otu="!combinedMetricsAvailability.hasOtu"
                :disable-cns="!combinedMetricsAvailability.hasCns"
                :disable-gf="!combinedMetricsAvailability.hasGf"
                :disable-po2-measured="!combinedMetricsAvailability.hasPo2Measured"
                :disable-po2-calculated="!combinedMetricsAvailability.hasPo2Calculated"
                :disable-po2-setpoint="!combinedMetricsAvailability.hasPo2Setpoint"
                :disable-rmv="!combinedMetricsAvailability.hasRmv"
                :disable-gas-o2="!combinedMetricsAvailability.hasGasO2"
                :disable-gas-n2="!combinedMetricsAvailability.hasGasN2"
                :disable-gas-he="!combinedMetricsAvailability.hasGasHe"
                :show-segments-toggle="true"
                v-model:left-axis-metric="leftAxisMetric"
                v-model:right-axis-metric="rightAxisMetric"
              />
            </div>

            <!-- Right column: Empty spacer (hidden on small screens) -->
            <div class="hidden xl:block"></div>
          </div>
        </div>

        <div class="graph-area flex-1 relative p-3">
          <DiveGraph
            :profiles="profiles"
            :visible-profiles="visibleProfiles"
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
            :has-temp="combinedMetricsAvailability.hasTemp"
            :has-ndl="combinedMetricsAvailability.hasNdl"
            :has-otu="combinedMetricsAvailability.hasOtu"
            :has-cns="combinedMetricsAvailability.hasCns"
            :has-gf="combinedMetricsAvailability.hasGf"
            :has-po2-measured="combinedMetricsAvailability.hasPo2Measured"
            :has-po2-calculated="combinedMetricsAvailability.hasPo2Calculated"
            :has-po2-setpoint="combinedMetricsAvailability.hasPo2Setpoint"
            :has-rmv="combinedMetricsAvailability.hasRmv"
            :has-gas-o2="combinedMetricsAvailability.hasGasO2"
            :has-gas-n2="combinedMetricsAvailability.hasGasN2"
            :has-gas-he="combinedMetricsAvailability.hasGasHe"
            :selected-profiles="selectedProfiles"
            v-model:left-axis-metric="leftAxisMetric"
            v-model:right-axis-metric="rightAxisMetric"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Embedded view -->
  <div v-else class="w-full">
    <div class="flex justify-end px-4 mb-2 gap-2">
      <ProfileSelector
        v-if="profiles.length > 1"
        :profiles="profiles"
        :visible-profiles="visibleProfiles"
        @toggle-profile="toggleProfile"
        @open-align-modal="showAlignmentModal = true"
      />
      <AnalyticsToggle v-model:show-segments="showSegments" />
    </div>
    <MetricsControlPanel
      class="px-4 mb-2"
      v-model:selected-profiles="selectedProfiles"
      :profiles-count="profiles.length"
      v-model:show-temp="showTemp"
      v-model:show-segments="showSegments"
      v-model:show-grid="showGrid"
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
      :disable-temp="!combinedMetricsAvailability.hasTemp"
      :disable-ndl="!combinedMetricsAvailability.hasNdl"
      :disable-otu="!combinedMetricsAvailability.hasOtu"
      :disable-cns="!combinedMetricsAvailability.hasCns"
      :disable-gf="!combinedMetricsAvailability.hasGf"
      :disable-po2-measured="!combinedMetricsAvailability.hasPo2Measured"
      :disable-po2-calculated="!combinedMetricsAvailability.hasPo2Calculated"
      :disable-po2-setpoint="!combinedMetricsAvailability.hasPo2Setpoint"
      :disable-rmv="!combinedMetricsAvailability.hasRmv"
      :disable-gas-o2="!combinedMetricsAvailability.hasGasO2"
      :disable-gas-n2="!combinedMetricsAvailability.hasGasN2"
      :disable-gas-he="!combinedMetricsAvailability.hasGasHe"
      :show-segments-toggle="false"
      v-model:left-axis-metric="leftAxisMetric"
      v-model:right-axis-metric="rightAxisMetric"
    />
    <div class="relative h-75">
      <DiveGraph
        :profiles="profiles"
        :visible-profiles="visibleProfiles"
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
        :has-temp="combinedMetricsAvailability.hasTemp"
        :has-ndl="combinedMetricsAvailability.hasNdl"
        :has-otu="combinedMetricsAvailability.hasOtu"
        :has-cns="combinedMetricsAvailability.hasCns"
        :has-gf="combinedMetricsAvailability.hasGf"
        :has-po2-measured="combinedMetricsAvailability.hasPo2Measured"
        :has-po2-calculated="combinedMetricsAvailability.hasPo2Calculated"
        :has-po2-setpoint="combinedMetricsAvailability.hasPo2Setpoint"
        :has-rmv="combinedMetricsAvailability.hasRmv"
        :has-gas-o2="combinedMetricsAvailability.hasGasO2"
        :has-gas-n2="combinedMetricsAvailability.hasGasN2"
        :has-gas-he="combinedMetricsAvailability.hasGasHe"
        :selected-profiles="selectedProfiles"
        v-model:left-axis-metric="leftAxisMetric"
        v-model:right-axis-metric="rightAxisMetric"
      />
    </div>
  </div>

  <ProfileAlignmentModal
    :profiles="profiles"
    :dive-id="diveId"
    :is-open="showAlignmentModal"
    @close="showAlignmentModal = false"
    @aligned="handleProfilesAligned"
  />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, toRef, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import ProfileAlignmentModal from '@/components/dive/view/ProfileAlignmentModal.vue'
import AnalyticsToggle from '@/components/dive/view/AnalyticsToggle.vue'
import ProfileSelector from '@/components/dive/view/ProfileSelector.vue'
import FullscreenGraphControls from '@/components/dive/view/FullscreenGraphControls.vue'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
import type { Dive, DiveProfile } from '@/lib/types/dive'
import type { MetricType } from '@/lib/types/graph'

interface Props {
  profiles: DiveProfile[]
  diveId: number
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
})

const visibleProfiles = ref<boolean[]>([])
const selectedProfiles = ref<number[]>([0])
const isClosing = ref(false)
const historyEntryAdded = ref(false)

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
  getCombinedMetricAvailability,
} = useDiveGraphMetrics(profilesRef)

const leftAxisMetric = ref<MetricType>('depth')
const rightAxisMetric = ref<MetricType>('temp')

const toggleProfile = (idx: number) => {
  visibleProfiles.value[idx] = !visibleProfiles.value[idx]
}

const showAlignmentModal = ref(false)

const handleProfilesAligned = (updatedDive: Dive) => {
  // Emit the updated dive to parent so it can refresh
  emit('profiles-aligned', updatedDive)
}

const combinedMetricsAvailability = computed(() => {
  // Get indices of visible profiles
  const visibleIndices = visibleProfiles.value
    .map((visible, idx) => (visible ? idx : -1))
    .filter((idx) => idx >= 0)

  // Return combined availability for all visible profiles
  return getCombinedMetricAvailability(visibleIndices.length > 0 ? visibleIndices : [0])
})

// Automatically deselect metrics when they become unavailable, and re-enable when available
watch(
  () => combinedMetricsAvailability.value,
  (availability) => {
    if (!availability.hasTemp) showTemp.value = false
    else if (showTemp.value === false) showTemp.value = true

    if (!availability.hasNdl) showNdl.value = false
    else if (showNdl.value === false) showNdl.value = true

    if (!availability.hasOtu) showOtu.value = false
    else if (showOtu.value === false) showOtu.value = true

    if (!availability.hasCns) showCns.value = false
    else if (showCns.value === false) showCns.value = true

    if (!availability.hasGf) showGf.value = false
    else if (showGf.value === false) showGf.value = true

    if (!availability.hasPo2Measured) showPo2Measured.value = false
    else if (showPo2Measured.value === false) showPo2Measured.value = true

    if (!availability.hasPo2Calculated) showPo2Calculated.value = false
    else if (showPo2Calculated.value === false) showPo2Calculated.value = true

    if (!availability.hasPo2Setpoint) showPo2Setpoint.value = false
    else if (showPo2Setpoint.value === false) showPo2Setpoint.value = true

    if (!availability.hasRmv) showRmv.value = false
    else if (showRmv.value === false) showRmv.value = true

    if (!availability.hasGasO2) showGasO2.value = false
    else if (showGasO2.value === false) showGasO2.value = true

    if (!availability.hasGasN2) showGasN2.value = false
    else if (showGasN2.value === false) showGasN2.value = true

    if (!availability.hasGasHe) showGasHe.value = false
    else if (showGasHe.value === false) showGasHe.value = true
  },
  { deep: true },
)

const emit = defineEmits<{
  close: []
  'profiles-aligned': [updatedDive: Dive]
}>()

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.fullscreen) {
    e.preventDefault()
    handleClose()
  }
}

const handleClose = async () => {
  if (isClosing.value) return
  isClosing.value = true
  await unlockOrientation()
  await exitFullscreen()
  if (historyEntryAdded.value) {
    window.history.back()
  } else {
    emit('close')
  }
}

const onPopState = async () => {
  if (!props.fullscreen || isClosing.value) return
  isClosing.value = true
  await unlockOrientation()
  await exitFullscreen()
  emit('close')
}

const onFullscreenChange = () => {
  const inFullscreen = Boolean(document.fullscreenElement)
  if (!inFullscreen && !isClosing.value) {
    handleClose()
  }
}

const enterFullscreen = async () => {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (!document.fullscreenElement && el.requestFullscreen) {
    try {
      await el.requestFullscreen()
    } catch {
      /* ignore */
    }
  }
}

const exitFullscreen = async () => {
  if (typeof document === 'undefined') return
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen()
    } catch {
      /* ignore */
    }
  }
}

const lockLandscape = async () => {
  if (typeof screen === 'undefined') {
    return false
  }
  const orientation: ScreenOrientation & { lock: (a: OrientationType) => Promise<void> } =
    screen.orientation as ScreenOrientation & { lock: (a: OrientationType) => Promise<void> }
  try {
    await orientation.lock('landscape-primary')
    return true
  } catch {
    return false
  }
}

const unlockOrientation = async () => {
  if (typeof screen === 'undefined' || !screen.orientation?.unlock) return
  try {
    screen.orientation.unlock()
  } catch {
    /* ignore */
  }
}

const requestLandscape = async () => {
  const locked = await lockLandscape()
  if (!locked) {
    toast.info('Rotate for a wider view', {
      duration: 5000,
      position: 'top-center',
    })
  }
}

const updateRotateTip = () => {
  if (typeof window === 'undefined') return
  const isPortrait = window.innerHeight > window.innerWidth
  if (isPortrait) {
    toast.info('Rotate for a wider view', {
      duration: 5000,
      position: 'top-center',
    })
  }
}

onMounted(() => {
  // Initialize all profiles as visible
  visibleProfiles.value = props.profiles.map(() => true)

  if (props.fullscreen) {
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('orientationchange', updateRotateTip)
    window.addEventListener('resize', updateRotateTip)
    window.addEventListener('popstate', onPopState)
    if (typeof window !== 'undefined') {
      window.history.pushState({ fullscreen: true }, '')
      historyEntryAdded.value = true
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('hide-header')
    }
    updateRotateTip()
    enterFullscreen()
    requestLandscape()
  }
})

onBeforeUnmount(() => {
  if (props.fullscreen) {
    window.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    window.removeEventListener('orientationchange', updateRotateTip)
    window.removeEventListener('resize', updateRotateTip)
    window.removeEventListener('popstate', onPopState)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('hide-header')
    }
    unlockOrientation()
    exitFullscreen()
  }
})
</script>

<style scoped>
.graph-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.graph-modal-card {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: var(--card-bg, #ffffff);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.control-btn {
  padding: 8px 12px;
  font-size: 14px;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  transition:
    background 0.2s,
    opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.close-btn {
  background: #dc2626;
}

.close-btn:hover {
  background: #b91c1c;
}

[data-theme='dark'] .graph-modal-card {
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.rotate-tip {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
}

.control-btn.secondary {
  background: #0f766e;
}

.control-btn.secondary:hover {
  background: #0d5f59;
}

.profile-toggles {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  padding: 6px 12px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
}

.profile-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.profile-toggle input[type='checkbox'] {
  cursor: pointer;
  width: 14px;
  height: 14px;
  accent-color: #10b981;
}

.profile-toggle span {
  white-space: nowrap;
}

.graph-area {
  position: relative;
}

.checkbox-green {
  accent-color: #10b981;
}
</style>
