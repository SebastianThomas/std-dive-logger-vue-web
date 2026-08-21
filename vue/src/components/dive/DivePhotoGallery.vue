<template>
  <div class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <h2 class="text-lg font-semibold">Photos</h2>
      <div v-if="!readOnly" class="flex items-center gap-2 flex-wrap">
        <label class="upload-button" :class="{ disabled: uploading }">
          <span v-if="uploading">Uploading{{ uploadProgress }}...</span>
          <span v-else>Add photos</span>
          <input
            type="file"
            multiple
            accept="image/*,.zip"
            class="sr-only"
            :disabled="uploading"
            @change="handleFilesSelected"
          />
        </label>
        <button
          type="button"
          class="upload-button link-button"
          :class="{ disabled: uploading }"
          :disabled="uploading"
          @click="showLinkInput = !showLinkInput"
        >
          From a link
        </button>
      </div>
    </div>

    <form
      v-if="!readOnly && showLinkInput"
      class="link-import-row"
      @submit.prevent="handleImportFromUrl"
    >
      <input
        v-model="linkUrl"
        type="url"
        placeholder="Paste a link to an image or a .zip archive (OneDrive, Jottacloud, ...)"
        class="link-input"
        :disabled="uploading"
      />
      <button type="submit" class="upload-button" :disabled="uploading || !linkUrl.trim()">
        Import
      </button>
    </form>
    <p v-if="!readOnly && showLinkInput" class="text-xs text-gray-500 dark:text-gray-400 mb-2">
      Fetched by the server, not your browser - so a private/internal link will be rejected, and
      very large files may time out.
    </p>

    <p v-if="error" class="error-message">{{ error }}</p>

    <p v-if="!loading && photos.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No photos yet{{ readOnly ? '' : ' - add some with the button above' }}. Individual images or
      a .zip archive (unzipped right here in your browser, then uploaded photo by photo) both
      work.
    </p>

    <div v-else class="thumbnail-grid">
      <div v-for="photo in photos" :key="photo.id" class="thumbnail-wrapper">
        <button
          type="button"
          class="thumbnail-button"
          @click="openLightbox(photo)"
          :aria-label="`Open photo ${photo.id}`"
        >
          <img
            v-if="thumbnailUrls[photo.id]"
            :src="thumbnailUrls[photo.id]"
            class="thumbnail-img"
            alt="Dive photo thumbnail"
          />
          <span v-else class="thumbnail-loading">…</span>
        </button>
        <button
          v-if="!readOnly"
          type="button"
          class="thumbnail-delete"
          title="Delete photo"
          @click="deletePhoto(photo)"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="lightboxPhoto" class="lightbox-overlay" @click.self="closeLightbox">
      <button type="button" class="lightbox-close" @click="closeLightbox">×</button>
      <img
        v-if="thumbnailUrls[lightboxPhoto.id]"
        :src="thumbnailUrls[lightboxPhoto.id]"
        class="lightbox-img"
        alt="Dive photo"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { unzipSync } from 'fflate'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { useAuthStore } from '@/stores/auth'
import type { DivePhoto, DivePhotoUploadUrlResponse } from '@/lib/types/dive'

const props = defineProps<{
  diveId: number
  readOnly?: boolean
}>()

const { getWithToken, postWithToken, deleteWithToken } = useApi()
const authStore = useAuthStore()

const photos = ref<DivePhoto[]>([])
const thumbnailUrls = ref<Record<number, string>>({})
const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const error = ref('')
const lightboxPhoto = ref<DivePhoto | null>(null)
const showLinkInput = ref(false)
const linkUrl = ref('')

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
}

function guessImageMimeType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? (EXTENSION_MIME_TYPES[ext] ?? null) : null
}

async function loadThumbnail(photoId: number) {
  try {
    const response = await getWithToken<Blob>(`/v1/dives/${props.diveId}/photos/${photoId}`, {
      responseType: 'blob',
    })
    thumbnailUrls.value[photoId] = URL.createObjectURL(response.data)
  } catch (err) {
    console.error('Failed to load dive photo thumbnail', err)
  }
}

async function loadPhotos() {
  loading.value = true
  error.value = ''
  try {
    const response = await getWithToken<DivePhoto[]>(`/v1/dives/${props.diveId}/photos`)
    photos.value = response.data
    await Promise.all(photos.value.map((p) => loadThumbnail(p.id)))
  } catch (err) {
    console.error('Failed to load dive photos', err)
    error.value = 'Could not load photos.'
  } finally {
    loading.value = false
  }
}

/**
 * PUTs raw bytes directly to storage - the same shape whether `uploadUrl` is a real presigned R2
 * URL (production, absolute, no auth header - a bearer token has no business going to a
 * third-party storage host) or the local-dev fallback (relative, same backend origin, needs our
 * auth header since that endpoint is behind normal login like everything else in this app).
 */
async function putToStorage(uploadUrl: string, file: File | Blob, contentType: string) {
  const isBackendLocalUpload = uploadUrl.startsWith('/')
  const headers: Record<string, string> = { 'Content-Type': contentType }
  if (isBackendLocalUpload && authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`
  }
  const res = await fetch(resolveUrl(uploadUrl), { method: 'PUT', headers, body: file })
  if (!res.ok) {
    throw new Error(`Upload to storage failed (${res.status})`)
  }
}

async function uploadSingleFile(file: File | Blob, filename: string) {
  const contentType = (file as File).type || guessImageMimeType(filename) || 'application/octet-stream'
  const uploadUrlResponse = await postWithToken<DivePhotoUploadUrlResponse>(
    `/v1/dives/${props.diveId}/photos/upload-url`,
    { contentType, filename },
  )
  const { photoId, uploadUrl } = uploadUrlResponse.data

  await putToStorage(uploadUrl, file, contentType)

  const confirmed = await postWithToken<DivePhoto>(
    `/v1/dives/${props.diveId}/photos/${photoId}/confirm`,
    { byteSize: file.size },
  )
  photos.value.push(confirmed.data)
  await loadThumbnail(confirmed.data.id)
}

/** Extracts a .zip client-side into individual image files - the backend never handles archives. */
async function expandZipToImageFiles(file: File): Promise<{ name: string; data: Uint8Array }[]> {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const entries = unzipSync(buffer)
  return Object.entries(entries)
    .filter(([name, data]) => !name.endsWith('/') && data.length > 0 && guessImageMimeType(name))
    .map(([name, data]) => ({ name, data }))
}

async function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  uploading.value = true
  error.value = ''
  let uploadedCount = 0
  let failedCount = 0
  try {
    // Flatten selection into a single list of (name, blob-like) uploads: zip archives expand
    // into their individual image entries first, plain image files pass through as-is - both
    // then go through the exact same per-file upload-url/PUT/confirm flow.
    const toUpload: { name: string; blob: File | Blob }[] = []
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const extracted = await expandZipToImageFiles(file)
          for (const entry of extracted) {
            toUpload.push({
              name: entry.name,
              blob: new Blob([entry.data as BlobPart], {
                type: guessImageMimeType(entry.name) ?? 'application/octet-stream',
              }),
            })
          }
        } catch (err) {
          console.error('Failed to unzip archive', file.name, err)
          failedCount += 1
        }
      } else {
        toUpload.push({ name: file.name, blob: file })
      }
    }

    for (const { name, blob } of toUpload) {
      uploadProgress.value = ` (${uploadedCount + failedCount + 1}/${toUpload.length})`
      try {
        await uploadSingleFile(blob, name)
        uploadedCount += 1
      } catch (err) {
        console.error('Failed to upload dive photo', name, err)
        failedCount += 1
      }
    }
  } finally {
    uploading.value = false
    uploadProgress.value = ''
  }

  if (uploadedCount > 0) {
    toast.success(`Uploaded ${uploadedCount} photo${uploadedCount === 1 ? '' : 's'}.`)
  }
  if (failedCount > 0) {
    error.value = `${failedCount} photo${failedCount === 1 ? '' : 's'} failed to upload.`
    toast.error(error.value)
  }
}

/**
 * Fetched server-side (see DivePhotoService.importFromUrl) rather than by this browser - most
 * file-sharing hosts (OneDrive, Jottacloud, ...) don't send CORS headers permissive enough for a
 * client-side fetch of an arbitrary share link to work, so this routes through the backend
 * instead. A single image URL becomes one photo; a .zip archive becomes one photo per image entry.
 */
async function handleImportFromUrl() {
  const url = linkUrl.value.trim()
  if (!url) return
  uploading.value = true
  error.value = ''
  try {
    const res = await postWithToken<DivePhoto[]>(`/v1/dives/${props.diveId}/photos/import-url`, {
      url,
    })
    photos.value.push(...res.data)
    await Promise.all(res.data.map((p) => loadThumbnail(p.id)))
    toast.success(`Imported ${res.data.length} photo${res.data.length === 1 ? '' : 's'}.`)
    linkUrl.value = ''
    showLinkInput.value = false
  } catch (err) {
    console.error('Failed to import photo(s) from URL', err)
    error.value = 'Could not import from that link.'
    toast.error(error.value)
  } finally {
    uploading.value = false
  }
}

async function deletePhoto(photo: DivePhoto) {
  try {
    await deleteWithToken(`/v1/dives/${props.diveId}/photos/${photo.id}`)
    photos.value = photos.value.filter((p) => p.id !== photo.id)
    const url = thumbnailUrls.value[photo.id]
    if (url) {
      URL.revokeObjectURL(url)
      delete thumbnailUrls.value[photo.id]
    }
    if (lightboxPhoto.value?.id === photo.id) {
      lightboxPhoto.value = null
    }
  } catch (err) {
    console.error('Failed to delete dive photo', err)
    toast.error('Could not delete photo.')
  }
}

function openLightbox(photo: DivePhoto) {
  lightboxPhoto.value = photo
}

function closeLightbox() {
  lightboxPhoto.value = null
}

onMounted(() => {
  loadPhotos()
})

onBeforeUnmount(() => {
  Object.values(thumbnailUrls.value).forEach((url) => URL.revokeObjectURL(url))
})
</script>

<style scoped>
.upload-button {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-button:hover:not(.disabled) {
  background: #2563eb;
}

.upload-button.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-button {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.link-button:hover:not(.disabled) {
  background: rgba(59, 130, 246, 0.08);
}

.link-import-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.link-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(209, 213, 219, 0.7);
  background: transparent;
  font-size: 13px;
}

[data-theme='dark'] .link-input {
  border-color: rgba(75, 85, 99, 0.7);
  color: white;
}

.error-message {
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

[data-theme='dark'] .error-message {
  background: rgba(127, 29, 29, 0.3);
  color: #fca5a5;
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}

.thumbnail-wrapper {
  position: relative;
}

.thumbnail-button {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(209, 213, 219, 0.5);
  background: rgba(209, 213, 219, 0.15);
  padding: 0;
  cursor: pointer;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--foreground, #9ca3af);
  font-size: 20px;
}

.thumbnail-delete {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: #dc2626;
  color: white;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-delete:hover {
  background: #b91c1c;
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 6px;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 24px;
  background: none;
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
}
</style>
