<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-3xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h1 class="text-2xl font-bold mb-4">Upload Dive Files</h1>

      <div class="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="px-3 py-2 text-sm font-medium border-b-2 -mb-px"
          :class="
            mode === 'files'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="mode = 'files'"
        >
          Upload files
        </button>
        <button
          type="button"
          class="px-3 py-2 text-sm font-medium border-b-2 -mb-px"
          :class="
            mode === 'divesoft'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="mode = 'divesoft'"
        >
          Import from Divesoft (wetnotes.com)
        </button>
      </div>

      <div v-if="mode === 'files'" class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Files</label>
          <button
            type="button"
            class="border-2 border-dashed border-sky-300 bg-sky-50 dark:bg-sky-900 dark:border-sky-600 rounded-xl p-6 text-center cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-800 hover:border-sky-400 dark:hover:border-sky-500"
            @click="fileInputRef?.click()"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <div class="text-sky-500 dark:text-sky-400 text-4xl mb-2">
              <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <p class="text-gray-700 dark:text-gray-200">
              <span v-if="files.length" class="font-semibold"
                >{{ files.length }} file(s) selected</span
              >
              <span v-else><span class="font-semibold">Click to upload</span> or drag & drop</span>
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiple files supported</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Supported formats: UDDF, XML, FIT (POSB not yet supported)
            </p>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            multiple
            accept=".uddf,.xml,.posb,.fit"
            @change="onFileInput"
          />
          <ul
            v-if="files.length"
            class="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5 space-y-1"
          >
            <li v-for="f in files" :key="f.name">{{ f.name }}</li>
          </ul>
          <button
            v-if="files.length"
            type="button"
            class="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 text-sm self-start"
            @click="clearFiles"
          >
            Clear Files
          </button>
        </div>

        <div class="flex justify-end gap-3">
          <button
            :disabled="loading"
            class="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="safeBack"
          >
            Cancel
          </button>
          <button
            :disabled="loading"
            class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            @click="handleSubmit"
          >
            <span v-if="loading" class="inline-block animate-spin">
              <i class="fas fa-spinner"></i>
            </span>
            {{ loading ? 'Uploading...' : 'Submit' }}
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col gap-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Sign in with your wetnotes.com account to import a Divesoft Liberty dive log. Your
          password is only used to sign in directly with wetnotes.com in your browser - it is
          never sent to our servers.
        </p>
        <div class="flex flex-col">
          <label for="divesoft-email" class="mb-1 font-medium text-gray-700 dark:text-gray-300">
            wetnotes.com Email
          </label>
          <input
            id="divesoft-email"
            v-model="divesoftEmail"
            type="text"
            placeholder="Enter email address"
            class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div class="flex flex-col">
          <label for="divesoft-password" class="mb-1 font-medium text-gray-700 dark:text-gray-300">
            wetnotes.com Password
          </label>
          <input
            id="divesoft-password"
            v-model="divesoftPassword"
            type="password"
            placeholder="Enter password"
            class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div class="flex flex-col">
          <label for="divesoft-dive" class="mb-1 font-medium text-gray-700 dark:text-gray-300">
            Dive URL or ID (leave blank to import all dives)
          </label>
          <input
            id="divesoft-dive"
            v-model="divesoftDiveInput"
            type="text"
            placeholder="https://wetnotes.com/app/dives/... or leave blank"
            class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div class="flex justify-end gap-3">
          <button
            :disabled="loading"
            class="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="safeBack"
          >
            Cancel
          </button>
          <button
            :disabled="loading"
            class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            @click="handleDivesoftSubmit"
          >
            <span v-if="loading" class="inline-block animate-spin">
              <i class="fas fa-spinner"></i>
            </span>
            {{ loading ? 'Importing...' : 'Import' }}
          </button>
        </div>
      </div>

      <p
        v-if="status"
        class="text-sm mt-4"
        :class="status.startsWith('Error') ? 'text-red-600' : 'text-green-700'"
      >
        {{ status }}
      </p>
      <div v-if="errors">
        <p class="text-sm" :class="'text-red-600'" v-for="e in errors" :key="e">{{ e }}</p>
      </div>

      <!-- Hints & Tips -->
      <div
        class="mt-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4"
      >
        <div class="flex items-start gap-3">
          <div class="text-amber-600 dark:text-amber-400 text-xl leading-none">
            <i class="fas fa-lightbulb"></i>
          </div>
          <div>
            <h2 class="font-semibold text-amber-900 dark:text-amber-200 mb-1">Hints & Tips</h2>
            <ul class="list-disc pl-5 text-sm text-amber-900/90 dark:text-amber-100/90 space-y-1">
              <li>
                Shearwater auto-merge: Add a <strong>+</strong> in front of the dive number in the
                Shearwater Cloud app before exporting to auto-merge the uploaded dive into an
                existing dive with the same number. If no such dive exists, the upload will return
                an error.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <DiveSiteSelector
      v-if="showSelectSite"
      :initial-name="missingSiteName ?? undefined"
      @site-selected="onSiteSelected"
      @site-created="onSiteCreated"
      @close="handleSelectSiteClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useNavigation } from '@/composables/useNavigation'
import { toast } from 'vue-sonner'
import DiveSiteSelector from '@/components/DiveSiteSelector.vue'
import type { UploadDiveResult, DiveSite } from '@/lib/types/dive'
import { resolveImporterUrl } from '@/lib/globals/url/resolveUrl'
import {
  getDivesoftConfig,
  loginDivesoft,
  listDivesoftDiveIds,
  getDivesoftDive,
  extractDivesoftDiveId,
  DivesoftLoginError,
  type DivesoftDiveJson,
} from '@/lib/divesoft'
import axios from 'axios'

const { safeBack, router } = useNavigation()
const { postWithToken } = useApi()

const mode = ref<'files' | 'divesoft'>('files')

const files = ref<File[]>([])
const status = ref('')
const errors = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const showSelectSite = ref(false)
const missingSiteName = ref<string | null>(null)
const createdSiteId = ref<number | null>(null)
const loading = ref(false)

const divesoftEmail = ref('')
const divesoftPassword = ref('')
const divesoftDiveInput = ref('')
// Cache of already-fetched dive JSON so a "missing dive site" retry can re-submit to our backend
// without signing in to wetnotes.com again.
const pendingDivesoftDives = ref<DivesoftDiveJson[] | null>(null)
const lastImportSource = ref<'files' | 'divesoft'>('files')

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const validExts = ['uddf', 'xml', 'posb', 'fit']
      return validExts.includes(ext || '')
    })
    if (validFiles.length < droppedFiles.length) {
      status.value =
        'Warning: Some files were skipped due to unsupported format. Supported: UDDF, XML, FIT, POSB.'
    }
    files.value = validFiles
  }
}

const onFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    const validFiles = Array.from(target.files).filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const validExts = ['uddf', 'xml', 'posb', 'fit']
      return validExts.includes(ext || '')
    })
    if (validFiles.length < target.files.length) {
      status.value =
        'Warning: Some files were skipped due to unsupported format. Supported: UDDF, XML, FIT, POSB.'
    }
    files.value = validFiles
  }
}

const clearFiles = () => {
  files.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Keyboard shortcuts for DiveCreateView
const handleDiveCreateKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    // Allow Ctrl+Enter in inputs
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      if (mode.value === 'files') {
        handleSubmit()
      } else {
        handleDivesoftSubmit()
      }
      return
    }
    return
  }
  // Ctrl+Enter to submit
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    if (mode.value === 'files') {
      handleSubmit()
    } else {
      handleDivesoftSubmit()
    }
  }
  // Escape to cancel
  if (event.key === 'Escape') {
    safeBack()
  }
}

/** Shared handling of a successful `UploadDiveResult` response, for either import path. */
const handleImportSuccess = (
  res: UploadDiveResult,
  toastId: string | number,
  onClear: () => void,
) => {
  const isErrors = res.errors && res.errors.length > 0
  const isDives = res.dives && res.dives.length > 0
  if (isErrors && isDives) {
    status.value = `Import tried, successfully imported dives ${res.dives.map((d) => d.number).join(', ')}, but got errors.`
    errors.value = res.errors
    toast.dismiss(toastId)
    toast.success(`Imported dives: ${res.dives.map((d) => d.number).join(', ')} with some errors`, {
      duration: 10000,
    })
  } else if (isErrors) {
    status.value = `Import tried, no dives successful, but got errors`
    errors.value = res.errors
    toast.dismiss(toastId)
    toast.error('Import completed with errors', { duration: 10000 })
  } else {
    status.value = `Import complete: Imported ${res.dives.map((d) => d.number).join(', ')}`
    toast.dismiss(toastId)
    toast.success(
      `Successfully imported ${res.dives.length} dive(s): ${res.dives.map((d) => d.number).join(', ')}`,
      { duration: 10000 },
    )
    if (res.dives.length === 1) {
      router.push({ name: 'DiveView', params: { diveId: res.dives[0]!.id } })
    }
    onClear()
  }
}

/** Shared handling of a failed import request, for either import path. */
const handleImportError = (err: unknown, toastId: string | number) => {
  toast.dismiss(toastId)
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as
      | {
          title?: string
          field?: string
          additionalMessage?: string
          status?: number
          name?: string
          reason?: string
          detail?: string
        }
      | UploadDiveResult
    if ('reason' in data && data.reason === 'MISSING_VALUE' && data.field === 'DIVE_SITE') {
      missingSiteName.value = data.name ?? null
      // Show site selector instead of just create
      showSelectSite.value = true
      return
    }
    if ('dives' in data && 'errors' in data) {
      status.value = `Error: Import for ${data.dives.length} dives would work, but failed importing ${data.errors.length} dives: \n${data.errors.join('\n')}`
    } else {
      status.value = `Error: ${data.title ?? 'Import failed'} (${data.detail ?? 'No more information'})`
    }
    toast.error(`Import failed: ${status.value}`, { duration: 10000 })
  } else {
    status.value = 'Error: Import failed'
    toast.error('Import failed. Please try again.', { duration: 10000 })
  }
}

const handleSubmit = async () => {
  status.value = ''
  if (!files.value.length) {
    status.value = 'Error: Please add at least one file.'
    return
  }

  lastImportSource.value = 'files'
  loading.value = true
  const toastId = toast.loading('Uploading dive files... This may take a few minutes.', {
    duration: 10000,
  })

  try {
    const formDataObj = new FormData()
    const body: { diveSiteId?: number } = {}
    if (createdSiteId.value) {
      body.diveSiteId = createdSiteId.value
    }
    const bodyBlob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    formDataObj.append('uploadBody', bodyBlob)
    files.value.forEach((f) => formDataObj.append('file', f))

    const res = (
      await postWithToken<UploadDiveResult, FormData>(
        resolveImporterUrl(`/v1/import`),
        formDataObj,
        {},
        null,
      )
    ).data
    handleImportSuccess(res, toastId, () => {
      files.value = []
      createdSiteId.value = null
    })
  } catch (err) {
    handleImportError(err, toastId)
  } finally {
    loading.value = false
  }
}

/** Posts already-fetched Divesoft dive JSON to our backend and handles the result. */
const postDivesoftDives = async (dives: DivesoftDiveJson[], toastId: string | number) => {
  const body: { diveSiteId?: number } = {}
  if (createdSiteId.value) {
    body.diveSiteId = createdSiteId.value
  }
  const res = (
    await postWithToken<UploadDiveResult, { dives: DivesoftDiveJson[]; body: object }>(
      resolveImporterUrl('/v1/import/divesoft'),
      { dives, body },
    )
  ).data
  handleImportSuccess(res, toastId, () => {
    pendingDivesoftDives.value = null
    divesoftDiveInput.value = ''
    createdSiteId.value = null
  })
}

const handleDivesoftSubmit = async () => {
  status.value = ''
  if (!divesoftEmail.value || !divesoftPassword.value) {
    status.value = 'Error: Please enter your wetnotes.com email and password.'
    return
  }

  lastImportSource.value = 'divesoft'
  loading.value = true
  const toastId = toast.loading('Signing in to wetnotes.com...', { duration: 10000 })

  try {
    const config = await getDivesoftConfig()
    const token = await loginDivesoft(config, divesoftEmail.value, divesoftPassword.value)
    // Never keep the password around any longer than needed for the login call above.
    divesoftPassword.value = ''

    const diveIdInput = divesoftDiveInput.value.trim()
    let dives: DivesoftDiveJson[]
    if (diveIdInput) {
      dives = [await getDivesoftDive(config, token, extractDivesoftDiveId(diveIdInput))]
    } else {
      toast.loading('Fetching your dives from wetnotes.com...', { id: toastId })
      const ids = await listDivesoftDiveIds(config, token)
      dives = []
      for (const [index, id] of ids.entries()) {
        toast.loading(`Fetching dive ${index + 1} of ${ids.length}...`, { id: toastId })
        dives.push(await getDivesoftDive(config, token, id))
      }
    }
    pendingDivesoftDives.value = dives

    toast.loading('Importing...', { id: toastId })
    await postDivesoftDives(dives, toastId)
  } catch (err) {
    if (err instanceof DivesoftLoginError) {
      toast.dismiss(toastId)
      toast.error(err.message)
      status.value = `Error: ${err.message}`
    } else {
      handleImportError(err, toastId)
    }
  } finally {
    loading.value = false
  }
}

const onSiteCreated = async (site: DiveSite) => {
  showSelectSite.value = false
  missingSiteName.value = null
  createdSiteId.value = site.id ?? null
  try {
    if (lastImportSource.value === 'divesoft' && pendingDivesoftDives.value) {
      const toastId = toast.loading('Importing...', { duration: 10000 })
      loading.value = true
      try {
        await postDivesoftDives(pendingDivesoftDives.value, toastId)
      } finally {
        loading.value = false
      }
    } else {
      await handleSubmit()
    }
  } catch (err) {
    console.error('Error submitting after site creation:', err)
    status.value = 'Error: Failed to import dives after site creation. Please try again.'
  }
}

const onSiteSelected = async (site: DiveSite) => {
  showSelectSite.value = false
  createdSiteId.value = site.id ?? null
  try {
    if (lastImportSource.value === 'divesoft' && pendingDivesoftDives.value) {
      const toastId = toast.loading('Importing...', { duration: 10000 })
      loading.value = true
      try {
        await postDivesoftDives(pendingDivesoftDives.value, toastId)
      } finally {
        loading.value = false
      }
    } else {
      await handleSubmit()
    }
  } catch (err) {
    console.error('Error submitting after site selection:', err)
    status.value = 'Error: Failed to import dives after site selection. Please try again.'
  }
}

const handleSelectSiteClose = () => {
  showSelectSite.value = false
  missingSiteName.value = null
}

onMounted(() => {
  window.addEventListener('keydown', handleDiveCreateKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDiveCreateKeydown)
})
</script>

<style scoped></style>
