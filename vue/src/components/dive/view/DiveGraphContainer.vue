<template>
  <div v-if="fullscreen" class="graph-modal-overlay">
    <div class="graph-modal-card fullscreen">
      <div class="modal-controls">
        <div v-if="showRotateTip" class="rotate-tip">
          <span>Rotate for a wider view.</span>
          <button class="control-btn secondary" @click="requestLandscape">Try rotate</button>
        </div>
        <div v-if="profiles.length > 1" class="profile-toggles">
          <label v-for="(profile, idx) in profiles" :key="profile.id" class="profile-toggle">
            <input type="checkbox" :checked="visibleProfiles[idx]" @change="toggleProfile(idx)" />
            <span>Profile {{ idx + 1 }}</span>
          </label>
        </div>
        <button class="control-btn close-btn" @click="handleClose">Close</button>
      </div>

      <div class="w-full h-full flex flex-col overflow-hidden">
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
          :show-segments-toggle="true"
        />

        <div class="graph-area flex-1 relative p-3">
          <label class="graph-grid-toggle">
            <input
              type="checkbox"
              class="w-4 h-4"
              :checked="showGrid"
              @change="showGrid = !showGrid"
            />
            <span>Show grid</span>
          </label>

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
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Embedded view -->
  <div v-else class="w-full">
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, toRef } from 'vue'
import MetricsControlPanel from '@/components/dive/view/MetricsControlPanel.vue'
import DiveGraph from '@/components/dive/view/DiveGraph.vue'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
import type { DiveProfile } from '@/lib/types/dive'

interface Props {
  profiles: DiveProfile[]
  diveId: number
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
})

const visibleProfiles = ref<boolean[]>([])
const showRotateTip = ref(false)
const isClosing = ref(false)

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

const filteredProfiles = computed(() =>
  props.profiles.filter((_, idx) => visibleProfiles.value[idx]),
)

const toggleProfile = (idx: number) => {
  visibleProfiles.value[idx] = !visibleProfiles.value[idx]
}

const emit = defineEmits<{
  close: []
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
    showRotateTip.value = true
  } else {
    showRotateTip.value = false
  }
}

const updateRotateTip = () => {
  if (typeof window === 'undefined') return
  // Only show rotate tip when in portrait (height > width)
  const isPortrait = window.innerHeight > window.innerWidth
  showRotateTip.value = isPortrait
}

onMounted(() => {
  // Initialize all profiles as visible
  visibleProfiles.value = props.profiles.map(() => true)

  if (props.fullscreen) {
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('orientationchange', updateRotateTip)
    window.addEventListener('resize', updateRotateTip)
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

.modal-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 410;
  display: flex;
  gap: 12px;
  align-items: center;
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
