<template>
  <div
    class="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed min-h-[calc(100vh-70px)] flex justify-center items-start pt-10 px-4 md:px-8"
  >
    <div class="w-full max-w-3xl bg-white p-6 rounded-lg shadow">
      <h1 class="text-2xl font-bold mb-4">Upload Dive Files</h1>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Files</label>
          <button
            type="button"
            class="border-2 border-dashed border-sky-300 bg-sky-50 rounded-xl p-6 text-center cursor-pointer hover:bg-sky-100 hover:border-sky-400"
            @click="fileInputRef?.click()"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <div class="text-sky-500 text-4xl mb-2">
              <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <p class="text-gray-700">
              <span v-if="files.length" class="font-semibold"
                >{{ files.length }} file(s) selected</span
              >
              <span v-else><span class="font-semibold">Click to upload</span> or drag & drop</span>
            </p>
            <p class="text-xs text-gray-500 mt-1">Multiple files supported</p>
          </button>
          <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFileInput" />
          <ul v-if="files.length" class="text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li v-for="f in files" :key="f.name">{{ f.name }}</li>
          </ul>
        </div>

        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400" @click="goBack">
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            @click="handleSubmit"
          >
            Submit
          </button>
        </div>

        <p
          v-if="status"
          class="text-sm"
          :class="status.startsWith('Error') ? 'text-red-600' : 'text-green-700'"
        >
          {{ status }}
        </p>
      </div>
    </div>

    <CreateDiveSite
      v-if="showCreateSite"
      :auto-open="true"
      :hide-trigger="true"
      :initial-name="missingSiteName || undefined"
      @created="onSiteCreated"
      @close="showCreateSite = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import CreateDiveSite from '@/components/CreateDiveSite.vue'
import type { DiveWithoutProfiles } from '@/lib/types/dive'

const router = useRouter()
const { postWithToken } = useApi()

const files = ref<File[]>([])
const status = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const showCreateSite = ref(false)
const missingSiteName = ref<string | null>(null)

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    files.value = Array.from(e.dataTransfer.files).filter(Boolean) as File[]
  }
}

const onFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) files.value = Array.from(target.files)
}

const goBack = () => router.back()

const handleSubmit = async () => {
  status.value = ''
  if (!files.value.length) {
    status.value = 'Error: Please add at least one file.'
    return
  }
  try {
    const formDataObj = new FormData()
    const body = {}
    const bodyBlob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    formDataObj.append('uploadBody', bodyBlob)
    files.value.forEach((f) => formDataObj.append('file', f))

    const res = await postWithToken<DiveWithoutProfiles[]>(
      '/v1/dives/upload',
      formDataObj,
      {},
      null,
    )
    status.value = 'Upload complete!'
    const dive = res.data?.[0]
    if (dive?.id) {
      router.push({ name: 'DiveView', params: { diveId: dive.id } })
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data as {
        title?: string
        field?: string
        additionalMessage?: string
        status?: number
        name?: string
        reason?: string
      }
      if (data.reason === 'MISSING_VALUE' && data.field === 'DIVE_SITE') {
        missingSiteName.value = data.name ?? null
        showCreateSite.value = true
        return
      }
      status.value = `Error: ${data.title ?? 'Upload failed'}`
    } else {
      status.value = 'Error: Upload failed'
    }
  }
}

const onSiteCreated = async () => {
  showCreateSite.value = false
  missingSiteName.value = null
  await handleSubmit()
}
</script>

<style scoped></style>
