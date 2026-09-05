<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Refine profile with another file</h2>
        <button class="close-button" @click="close">×</button>
      </div>

      <div class="modal-body">
        <template v-if="step === 'select'">
          <p class="hint">
            Re-parses a file for a dive you already logged - the same export, or a richer one in
            another format (e.g. Shearwater native XML or Suunto JSON instead of the FIT) - and
            replaces only this profile's raw measurements (depth, deco stops, gas, TTS, ...).
            Everything else on the dive is left untouched, unless the new file brings genuinely
            new info (notes, gas consumption, ...) that conflicts with what's there - you'll be
            asked which to keep. The upload is checked against the existing profile first; an
            unrelated dive is rejected rather than silently replacing the wrong one.
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
            <label for="reimport-file">Original dive computer file</label>
            <input
              id="reimport-file"
              type="file"
              accept=".uddf,.xml,.fit,.json,.zxu"
              class="form-file"
              @change="handleFileChange"
            />
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
        </template>

        <template v-else-if="step === 'resolve' && preview">
          <p class="hint">
            The reimported file disagrees with what's already on this dive for the field(s)
            below. Pick which to keep for each - everything else stays exactly as it was.
          </p>

          <div v-if="preview.conflicts.clockOffset" class="conflict-field">
            <div class="conflict-label">Start time</div>
            <p class="hint" style="margin-bottom: 8px">
              The uploaded file's clock is
              {{ Math.abs(preview.conflicts.clockOffset.offsetMinutes / 60) }} h off this profile -
              usually a UTC vs. local-time difference between two exports of the same dive, not a
              different dive.
            </p>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.startClock" value="EXISTING" />
              <span>Keep existing: {{ formatDate(preview.conflicts.clockOffset.existingStart) }}</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.startClock" value="NEW" />
              <span>Use uploaded: {{ formatDate(preview.conflicts.clockOffset.reimportedStart) }}</span>
            </label>
          </div>

          <div v-if="preview.conflicts.notes" class="conflict-field">
            <div class="conflict-label">Notes</div>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.notes" value="EXISTING" />
              <span>Keep existing: “{{ preview.conflicts.notes.existing }}”</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.notes" value="NEW" />
              <span>Use reimported: “{{ preview.conflicts.notes.reimported }}”</span>
            </label>
          </div>

          <div v-if="preview.conflicts.visibility" class="conflict-field">
            <div class="conflict-label">Visibility</div>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.visibility" value="EXISTING" />
              <span>Keep existing: {{ formatVisibility(preview.conflicts.visibility.existing) }}</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.visibility" value="NEW" />
              <span>Use reimported: {{ formatVisibility(preview.conflicts.visibility.reimported) }}</span>
            </label>
          </div>

          <div v-if="preview.conflicts.namedBuddies" class="conflict-field">
            <div class="conflict-label">Buddies</div>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.namedBuddies" value="EXISTING" />
              <span>Keep existing: {{ preview.conflicts.namedBuddies.existing.join(', ') }}</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.namedBuddies" value="NEW" />
              <span>Use reimported: {{ preview.conflicts.namedBuddies.reimported.join(', ') }}</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.namedBuddies" value="UNION" />
              <span>Combine both (no one dropped)</span>
            </label>
          </div>

          <div v-if="preview.conflicts.gasConsumption" class="conflict-field">
            <div class="conflict-label">Gas consumption</div>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.gasConsumption" value="EXISTING" />
              <span>Keep existing: {{ formatGasConsumption(preview.conflicts.gasConsumption.existing) }}</span>
            </label>
            <label class="conflict-option">
              <input type="radio" v-model="resolution.gasConsumption" value="NEW" />
              <span>Use reimported: {{ formatGasConsumption(preview.conflicts.gasConsumption.reimported) }}</span>
            </label>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
        </template>

        <div v-if="success" class="success-message">Profile reimported successfully!</div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close" :disabled="isLoading">Cancel</button>
        <button
          v-if="step === 'select'"
          class="btn-action"
          @click="handlePreview"
          :disabled="isLoading || !canReimport"
        >
          <span v-if="isLoading">Checking...</span>
          <span v-else>Refine profile</span>
        </button>
        <button
          v-else-if="step === 'resolve'"
          class="btn-action"
          @click="handleCommit"
          :disabled="isLoading"
        >
          <span v-if="isLoading">Applying...</span>
          <span v-else>Confirm</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type {
  Dive,
  DiveProfile,
  GasConsumption,
  ReimportPreviewResult,
  ReimportResolution,
  Visibility,
} from '@/lib/types/dive'
import { reimportHasAnyConflict } from '@/lib/types/dive'
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

const step = ref<'select' | 'resolve'>('select')
const selectedProfileIdx = ref(0)
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const error = ref('')
const success = ref(false)
const preview = ref<ReimportPreviewResult | null>(null)
// Defaults to the safest choice (keep what's already there / combine for buddies) - reimport
// should never silently drop information the user hasn't actively chosen to replace.
const resolution = ref<ReimportResolution>({
  notes: 'EXISTING',
  visibility: 'EXISTING',
  namedBuddies: 'UNION',
  gasConsumption: 'EXISTING',
  startClock: 'EXISTING',
})

const canReimport = computed(() => selectedFile.value !== null && props.profiles.length > 0)

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

const formatVisibility = (v: Visibility): string => {
  const parts: string[] = []
  if (v.meters != null) parts.push(`${v.meters}m`)
  if (v.description) parts.push(v.description)
  if (v.feeling) parts.push(v.feeling)
  return parts.length ? parts.join(', ') : '(empty)'
}

const formatGasConsumption = (g: GasConsumption): string =>
  `${g.sacBar.toFixed(1)} bar/min SAC, ${g.rmvLiters.toFixed(1)} l/min RMV`

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      step.value = 'select'
      error.value = ''
      success.value = false
      selectedProfileIdx.value = 0
      selectedFile.value = null
      preview.value = null
      resolution.value = {
        notes: 'EXISTING',
        visibility: 'EXISTING',
        namedBuddies: 'UNION',
        gasConsumption: 'EXISTING',
        startClock: 'EXISTING',
      }
    }
  },
)

const handlePreview = async () => {
  const profile = props.profiles[selectedProfileIdx.value]
  if (!profile || !selectedFile.value) return

  error.value = ''
  isLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await postWithToken<ReimportPreviewResult, FormData>(
      `/v1/dives/${props.diveId}/profiles/${profile.id}/reimport`,
      formData,
      {},
      null,
    )
    preview.value = response.data

    if (!reimportHasAnyConflict(response.data.conflicts)) {
      await commit(profile.id, response.data.pendingImportId, {})
    } else {
      step.value = 'resolve'
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reimport profile'
    error.value = message
    console.error('Reimport preview error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleCommit = async () => {
  const profile = props.profiles[selectedProfileIdx.value]
  if (!profile || !preview.value) return
  await commit(profile.id, preview.value.pendingImportId, resolution.value)
}

const commit = async (profileId: number, pendingImportId: number, body: ReimportResolution) => {
  error.value = ''
  isLoading.value = true
  try {
    const response = await postWithToken<Dive, ReimportResolution>(
      `/v1/dives/${props.diveId}/profiles/${profileId}/reimport/${pendingImportId}/commit`,
      body,
    )
    success.value = true
    emit('reimported', response.data)
    close()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply reimport'
    error.value = message
    console.error('Reimport commit error:', err)
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
  max-width: 480px;
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

.conflict-field {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(209, 213, 219, 0.3);
}

.conflict-field:last-child {
  border-bottom: none;
}

.conflict-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #111827);
  margin-bottom: 8px;
}

[data-theme='dark'] .conflict-label {
  color: var(--foreground, #e5e7eb);
}

.conflict-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--foreground, #374151);
  cursor: pointer;
}

[data-theme='dark'] .conflict-option {
  color: var(--foreground, #d1d5db);
}

.conflict-option input {
  margin-top: 2px;
  cursor: pointer;
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
