<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Profile Management</h2>
        <button class="close-button" @click="close">×</button>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'align' }" @click="activeTab = 'align'">
          Align
        </button>
        <button class="tab" :class="{ active: activeTab === 'reset' }" @click="activeTab = 'reset'">
          Reset
        </button>
      </div>

      <!-- Align Tab -->
      <div v-if="activeTab === 'align'" class="modal-body">
        <div class="form-group">
          <label for="reference-profile">Reference Profile (anchor)</label>
          <select v-model.number="referenceProfileIdx" id="reference-profile" class="form-select">
            <option v-for="(profile, idx) in profiles" :key="profile.id" :value="idx">
              Profile {{ idx + 1 }} ({{ formatDate(profile.start) }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="target-profile">Target Profile (to be aligned)</label>
          <select v-model.number="targetProfileIdx" id="target-profile" class="form-select">
            <option v-for="(profile, idx) in profiles" :key="profile.id" :value="idx">
              <span v-if="idx === referenceProfileIdx">(reference)</span>
              <span v-else>Profile {{ idx + 1 }} ({{ formatDate(profile.start) }})</span>
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="alignment-type">Alignment Algorithm</label>
          <select v-model="alignmentType" id="alignment-type" class="form-select">
            <option value="AUTO_MIN_AVG_DISTANCE">Minimum Average Distance</option>
            <option value="AUTO_MIN_AVG_SQ_DISTANCE">Minimum Average Squared Distance</option>
            <option value="AUTO_MIN_MAX_DISTANCE">Minimum Maximum Distance</option>
          </select>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">Profiles aligned successfully!</div>
      </div>

      <!-- Reset Tab -->
      <div v-else-if="activeTab === 'reset'" class="modal-body">
        <div class="form-group">
          <label>Select Profiles to Reset</label>
          <div class="checkbox-group">
            <label v-for="(profile, idx) in profiles" :key="profile.id" class="checkbox-label">
              <input
                type="checkbox"
                :checked="selectedResetProfiles.includes(profile.id)"
                @change="toggleResetProfile(profile.id)"
              />
              <span>Profile {{ idx + 1 }} ({{ formatDate(profile.start) }})</span>
            </label>
          </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">Profiles reset successfully!</div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close" :disabled="isLoading">Cancel</button>
        <button
          v-if="activeTab === 'align'"
          class="btn-action"
          @click="handleAlign"
          :disabled="isLoading || !canAlign"
        >
          <span v-if="isLoading">Aligning...</span>
          <span v-else>Align Profiles</span>
        </button>
        <button
          v-else-if="activeTab === 'reset'"
          class="btn-action btn-reset"
          @click="handleReset"
          :disabled="isLoading || selectedResetProfiles.length === 0"
        >
          <span v-if="isLoading">Resetting...</span>
          <span v-else>Reset Profiles</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { AlignmentType, Dive, DiveProfile } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'

interface Props {
  profiles: DiveProfile[]
  diveId: number
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  aligned: [updatedDive: Dive]
}>()

const { postWithToken } = useApi()

const activeTab = ref<'align' | 'reset'>('align')
const referenceProfileIdx = ref(0)
const targetProfileIdx = ref(1)
const alignmentType = ref<AlignmentType>('AUTO_MIN_AVG_DISTANCE')
const selectedResetProfiles = ref<number[]>([])
const isLoading = ref(false)
const error = ref('')
const success = ref(false)

const canAlign = computed(() => {
  return referenceProfileIdx.value !== targetProfileIdx.value && props.profiles.length >= 2
})

const toggleResetProfile = (profileId: number) => {
  const idx = selectedResetProfiles.value.indexOf(profileId)
  if (idx > -1) {
    selectedResetProfiles.value.splice(idx, 1)
  } else {
    selectedResetProfiles.value.push(profileId)
  }
}

// Initialize target profile when reference changes
watch(
  () => referenceProfileIdx.value,
  (newRef) => {
    if (targetProfileIdx.value === newRef) {
      // Find next available profile as target
      for (let i = 0; i < props.profiles.length; i++) {
        if (i !== newRef) {
          targetProfileIdx.value = i
          break
        }
      }
    }
  },
)

// Reset to earliest profile when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      error.value = ''
      success.value = false
      activeTab.value = 'align'
      selectedResetProfiles.value = []
      // Set reference to earliest profile (first one)
      referenceProfileIdx.value = 0
      // Set target to second profile if available
      if (props.profiles.length > 1) {
        targetProfileIdx.value = 1
      }
    }
  },
)

const formatDate = (timestamp: number): string => {
  if (!timestamp) return 'Unknown'
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return 'Unknown'
  }
}

const handleAlign = async () => {
  if (!canAlign.value) return

  error.value = ''
  success.value = false
  isLoading.value = true

  try {
    const refProfile = props.profiles[referenceProfileIdx.value]
    const targetProfile = props.profiles[targetProfileIdx.value]

    if (!refProfile || !targetProfile) {
      throw new Error(
        `The profiles could not be selected (ref: ${referenceProfileIdx.value}, target: ${targetProfileIdx.value})`,
      )
    }

    const profileIds = [refProfile.id, targetProfile.id]

    const payload = {
      profileIds,
      type: alignmentType.value,
    }

    const response = await postWithToken<Dive, { profileIds: number[]; type: AlignmentType }>(
      `/v1/dives/${props.diveId}/profiles/align`,
      payload,
    )

    success.value = true
    emit('aligned', response.data)
    close()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to align profiles'
    error.value = message
    console.error('Alignment error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleReset = async () => {
  if (selectedResetProfiles.value.length === 0) return

  error.value = ''
  success.value = false
  isLoading.value = true

  try {
    const payload = selectedResetProfiles.value

    const response = await postWithToken<Dive, number[]>(
      `/v1/dives/${props.diveId}/profiles/reset`,
      payload,
    )

    success.value = true
    emit('aligned', response.data)
    close()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset profiles'
    error.value = message
    console.error('Reset error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

const close = () => {
  emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-card {
  position: relative;
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

[data-theme='dark'] .modal-card {
  background: var(--card-bg, #1f2937);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(209, 213, 219, 0.3);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground, #111827);
}

[data-theme='dark'] .modal-header h2 {
  color: var(--foreground, #e5e7eb);
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(209, 213, 219, 0.3);
}

.tab {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--foreground, #6b7280);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  background: rgba(209, 213, 219, 0.1);
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

[data-theme='dark'] .tab {
  color: #9ca3af;
}

[data-theme='dark'] .tab:hover {
  background: rgba(107, 114, 128, 0.1);
}

[data-theme='dark'] .tab.active {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--foreground, #6b7280);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(107, 114, 128, 0.1);
}

[data-theme='dark'] .close-button:hover {
  background: rgba(229, 231, 235, 0.1);
}

.modal-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--foreground, #374151);
}

[data-theme='dark'] .form-group label {
  color: var(--foreground, #d1d5db);
}

.form-select {
  padding: 8px 12px;
  border: 1px solid rgba(209, 213, 219, 0.5);
  border-radius: 8px;
  background: var(--input-bg, #ffffff);
  color: var(--foreground, #111827);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:hover {
  border-color: rgba(209, 213, 219, 0.8);
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

[data-theme='dark'] .form-select {
  background: #374151;
  color: #e5e7eb;
  border-color: rgba(107, 114, 128, 0.5);
}

[data-theme='dark'] .form-select:hover {
  border-color: rgba(107, 114, 128, 0.8);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: rgba(209, 213, 219, 0.1);
}

[data-theme='dark'] .checkbox-label:hover {
  background: rgba(107, 114, 128, 0.1);
}

.checkbox-label input[type='checkbox'] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.error-message {
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

[data-theme='dark'] .error-message {
  background: rgba(127, 29, 29, 0.3);
  color: #fca5a5;
}

.success-message {
  padding: 10px;
  background: #dcfce7;
  color: #166534;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

[data-theme='dark'] .success-message {
  background: rgba(20, 83, 45, 0.3);
  color: #86efac;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(209, 213, 219, 0.3);
  justify-content: flex-end;
}

.btn-cancel,
.btn-action {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: rgba(209, 213, 219, 0.2);
  color: var(--foreground, #374151);
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(209, 213, 219, 0.4);
}

.btn-action {
  background: #3b82f6;
  color: white;
}

.btn-action:hover:not(:disabled) {
  background: #2563eb;
}

.btn-reset {
  background: #ef4444;
}

.btn-reset:hover:not(:disabled) {
  background: #dc2626;
}

.btn-action:disabled,
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-theme='dark'] .btn-cancel {
  background: rgba(107, 114, 128, 0.2);
  color: #d1d5db;
}

[data-theme='dark'] .btn-cancel:hover:not(:disabled) {
  background: rgba(107, 114, 128, 0.4);
}
</style>
