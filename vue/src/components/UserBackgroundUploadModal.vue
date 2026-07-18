<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Background Image</h2>
        <button class="close-button" @click="close">×</button>
      </div>

      <div class="modal-body">
        <p class="hint">
          Upload a custom background photo to replace the default underwater scene shown across
          the whole app. PNG, JPEG, or WEBP, up to 5 MB — a wide landscape photo works best since
          it's stretched to cover the page. The default photo's credit is only shown while the
          default photo is in use.
        </p>

        <div class="preview-box">
          <img :src="previewUrl ?? currentBackgroundUrl ?? defaultBackgroundUrl" alt="Background preview" />
        </div>

        <div class="form-group">
          <label for="background-file">Background file</label>
          <input
            id="background-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="form-file"
            @change="handleFileChange"
          />
        </div>

        <ImagePublicConsentCheckbox v-if="selectedFile" v-model="consentGiven" />

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>
      </div>

      <div class="modal-footer">
        <button
          v-if="currentBackgroundUrl"
          class="btn-reset"
          @click="handleReset"
          :disabled="isLoading"
        >
          Reset to default
        </button>
        <div class="modal-footer-right">
          <button class="btn-cancel" @click="close" :disabled="isLoading">Cancel</button>
          <button
            class="btn-action"
            @click="handleUpload"
            :disabled="isLoading || !selectedFile || !consentGiven"
          >
            <span v-if="isLoading">Uploading...</span>
            <span v-else>Upload</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { User } from '@/lib/types/user'
import { useApi } from '@/composables/useApi'
import ImagePublicConsentCheckbox from '@/components/ImagePublicConsentCheckbox.vue'

interface Props {
  isOpen: boolean
  currentBackgroundUrl?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: [user: User]
}>()

const { postWithToken, deleteWithToken } = useApi()

const defaultBackgroundUrl = '/images/Karwela.png'

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const consentGiven = ref(false)

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file
  consentGiven.value = false
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = file ? URL.createObjectURL(file) : null
}

const resetLocalState = () => {
  error.value = ''
  success.value = ''
  selectedFile.value = null
  consentGiven.value = false
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) resetLocalState()
  },
)

const handleUpload = async () => {
  if (!selectedFile.value || !consentGiven.value) return

  error.value = ''
  success.value = ''
  isLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await postWithToken<User, FormData>(
      '/v1/users/background',
      formData,
      {},
      null,
    )

    success.value = 'Background image uploaded successfully!'
    emit('updated', response.data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload background image'
    error.value = message
    console.error('Background upload error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleReset = async () => {
  error.value = ''
  success.value = ''
  isLoading.value = true

  try {
    const response = await deleteWithToken<User>('/v1/users/background')
    success.value = 'Background image reset to default.'
    resetLocalState()
    emit('updated', response.data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset background image'
    error.value = message
    console.error('Background reset error:', err)
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
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
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

.preview-box {
  width: 100%;
  aspect-ratio: 16 / 7;
  border-radius: 10px;
  border: 1px solid rgba(209, 213, 219, 0.5);
  background: repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 12px 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-group {
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

.form-file {
  padding: 8px 12px;
  border: 1px solid rgba(209, 213, 219, 0.5);
  border-radius: 8px;
  background: var(--input-bg, #ffffff);
  color: var(--foreground, #111827);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-file:hover {
  border-color: rgba(209, 213, 219, 0.8);
}

[data-theme='dark'] .form-file {
  background: #374151;
  color: #e5e7eb;
  border-color: rgba(107, 114, 128, 0.5);
}

[data-theme='dark'] .form-file:hover {
  border-color: rgba(107, 114, 128, 0.8);
}

.error-message {
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 16px;
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
  margin-top: 16px;
}

[data-theme='dark'] .success-message {
  background: rgba(20, 83, 45, 0.3);
  color: #86efac;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(209, 213, 219, 0.3);
}

.modal-footer-right {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-action,
.btn-reset {
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

.btn-reset {
  background: transparent;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.4);
}

.btn-reset:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
}

.btn-action {
  background: #3b82f6;
  color: white;
}

.btn-action:hover:not(:disabled) {
  background: #2563eb;
}

.btn-action:disabled,
.btn-cancel:disabled,
.btn-reset:disabled {
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
