<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Reimport Profile</h2>
        <button class="close-button" @click="close">×</button>
      </div>

      <div class="modal-body">
        <p class="hint">
          Re-parses the original UDDF file and replaces only this profile's raw measurements
          (depth, deco stops, gas, ...). Everything else on the dive — suit, gas consumption,
          weight, visibility, description, tags, buddies — is left untouched. UDDF files only.
        </p>

        <div class="form-group">
          <label for="reimport-profile">Profile to replace</label>
          <select v-model.number="selectedProfileIdx" id="reimport-profile" class="form-select">
            <option v-for="(profile, idx) in profiles" :key="profile.id" :value="idx">
              Profile {{ idx + 1 }} ({{ formatDate(profile.start) }}, {{ profile.diveComputer?.customIdentifier }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="reimport-file">Original UDDF file</label>
          <input
            id="reimport-file"
            type="file"
            accept=".uddf"
            class="form-file"
            @change="handleFileChange"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">Profile reimported successfully!</div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close" :disabled="isLoading">Cancel</button>
        <button class="btn-action" @click="handleReimport" :disabled="isLoading || !canReimport">
          <span v-if="isLoading">Reimporting...</span>
          <span v-else>Reimport Profile</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Dive, DiveProfile } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'
import { formatDate } from '@/lib/utils/timeUtils'

interface Props {
  profiles: DiveProfile[]
  diveId: number
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  reimported: [updatedDive: Dive]
}>()

const { postWithToken } = useApi()

const selectedProfileIdx = ref(0)
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const error = ref('')
const success = ref(false)

const canReimport = computed(() => selectedFile.value !== null && props.profiles.length > 0)

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      error.value = ''
      success.value = false
      selectedProfileIdx.value = 0
      selectedFile.value = null
    }
  },
)

const handleReimport = async () => {
  const profile = props.profiles[selectedProfileIdx.value]
  if (!profile || !selectedFile.value) return

  error.value = ''
  success.value = false
  isLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await postWithToken<Dive, FormData>(
      `/v1/dives/${props.diveId}/profiles/${profile.id}/reimport`,
      formData,
      {},
      null,
    )

    success.value = true
    emit('reimported', response.data)
    close()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reimport profile'
    error.value = message
    console.error('Reimport error:', err)
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
  max-width: 440px;
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
  max-height: 60vh;
  overflow-y: auto;
}

.hint {
  font-size: 13px;
  color: var(--foreground, #6b7280);
  opacity: 0.8;
  margin: 0 0 16px;
  line-height: 1.5;
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

.form-select,
.form-file {
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

.form-select:hover,
.form-file:hover {
  border-color: rgba(209, 213, 219, 0.8);
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

[data-theme='dark'] .form-select,
[data-theme='dark'] .form-file {
  background: #374151;
  color: #e5e7eb;
  border-color: rgba(107, 114, 128, 0.5);
}

[data-theme='dark'] .form-select:hover,
[data-theme='dark'] .form-file:hover {
  border-color: rgba(107, 114, 128, 0.8);
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
