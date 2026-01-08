<template>
  <div class="graph-modal-overlay" :class="{ fullscreen: isFullscreen }">
    <div class="graph-modal-card" :class="{ fullscreen: isFullscreen }">
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

      <DiveGraphView
        :profiles="filteredProfiles"
        :dive-id="diveId"
        :show-grid-toggle="true"
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
        @update:show-temp="emit('update:showTemp', $event)"
        @update:show-segments="emit('update:showSegments', $event)"
        @update:show-grid="emit('update:showGrid', $event)"
        @update:show-ndl="emit('update:showNdl', $event)"
        @update:show-otu="emit('update:showOtu', $event)"
        @update:show-cns="emit('update:showCns', $event)"
        @update:show-gf="emit('update:showGf', $event)"
        @update:show-po2-measured="emit('update:showPo2Measured', $event)"
        @update:show-po2-calculated="emit('update:showPo2Calculated', $event)"
        @update:show-po2-setpoint="emit('update:showPo2Setpoint', $event)"
        @update:show-rmv="emit('update:showRmv', $event)"
        @update:show-gas-o2="emit('update:showGasO2', $event)"
        @update:show-gas-n2="emit('update:showGasN2', $event)"
        @update:show-gas-he="emit('update:showGasHe', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import DiveGraphView from '@/components/dive/view/DiveGraphView.vue'
import type { DiveProfile } from '@/lib/types/dive'

const isFullscreen = ref(true)
const showRotateTip = ref(false)
const isClosing = ref(false)
const visibleProfiles = ref<boolean[]>([])

type Props = {
  profiles: DiveProfile[]
  diveId: number
  showTemp?: boolean
  showSegments?: boolean
  showGrid?: boolean
  showNdl?: boolean
  showOtu?: boolean
  showCns?: boolean
  showGf?: boolean
  showPo2Measured?: boolean
  showPo2Calculated?: boolean
  showPo2Setpoint?: boolean
  showRmv?: boolean
  showGasO2?: boolean
  showGasN2?: boolean
  showGasHe?: boolean
}

const props = defineProps<Props>()

const filteredProfiles = computed(() =>
  props.profiles.filter((_, idx) => visibleProfiles.value[idx]),
)

const toggleProfile = (idx: number) => {
  visibleProfiles.value[idx] = !visibleProfiles.value[idx]
}

const emit = defineEmits<{
  close: []
  'update:showTemp': [boolean]
  'update:showSegments': [boolean]
  'update:showGrid': [boolean]
  'update:showNdl': [boolean]
  'update:showOtu': [boolean]
  'update:showCns': [boolean]
  'update:showGf': [boolean]
  'update:showPo2Measured': [boolean]
  'update:showPo2Calculated': [boolean]
  'update:showPo2Setpoint': [boolean]
  'update:showRmv': [boolean]
  'update:showGasO2': [boolean]
  'update:showGasN2': [boolean]
  'update:showGasHe': [boolean]
}>()

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
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
  isFullscreen.value = inFullscreen
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
      isFullscreen.value = true
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
  isFullscreen.value = false
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
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('orientationchange', updateRotateTip)
  window.addEventListener('resize', updateRotateTip)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('hide-header')
  }
  updateRotateTip()
  // Initialize all profiles as visible
  visibleProfiles.value = props.profiles.map(() => true)
  enterFullscreen()
  requestLandscape()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('orientationchange', updateRotateTip)
  window.removeEventListener('resize', updateRotateTip)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('hide-header')
  }
  unlockOrientation()
  exitFullscreen()
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
</style>
