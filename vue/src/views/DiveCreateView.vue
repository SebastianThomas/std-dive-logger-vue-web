<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-3xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h1 class="text-2xl font-bold mb-4">Upload Dive Files</h1>

      <div v-if="stagedImports.length === 0">
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
              :disabled="readOnly"
              class="border-2 border-dashed border-sky-300 bg-sky-50 dark:bg-sky-900 dark:border-sky-600 rounded-xl p-6 text-center cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-800 hover:border-sky-400 dark:hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span v-else
                  ><span class="font-semibold">Click to upload</span> or drag & drop</span
                >
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
              :disabled="loading || readOnly"
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

        <div v-else-if="!divesoftPickerItems" class="flex flex-col gap-4">
          <div
            class="text-sm text-gray-600 dark:text-gray-300 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-700 p-4"
          >
            <p class="font-medium text-gray-800 dark:text-gray-100 mb-1">
              wetnotes.com doesn't allow a direct sign-in from here, so this needs one manual step:
            </p>
            <ol class="list-decimal pl-5 space-y-1">
              <li>Log into <strong>wetnotes.com</strong> in another tab (if you aren't already).</li>
              <li>
                Open your browser's dev tools (F12), go to the
                <strong>Console</strong> tab, and run:
                <code
                  class="block mt-1 px-2 py-1 rounded bg-gray-800 text-gray-100 dark:bg-black text-xs overflow-x-auto"
                  >localStorage.getItem('access_token')</code
                >
              </li>
              <li>Copy the resulting value (without the surrounding quotes) and paste it below.</li>
            </ol>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This token is only valid for about 24 hours - you'll need to repeat this step for
              future imports.
            </p>
          </div>
          <div class="flex flex-col">
            <label for="divesoft-token" class="mb-1 font-medium text-gray-700 dark:text-gray-300">
              wetnotes.com Access Token
            </label>
            <textarea
              id="divesoft-token"
              v-model="divesoftToken"
              rows="3"
              placeholder="Paste the access_token value here"
              class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white font-mono text-xs"
            ></textarea>
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
              :disabled="loading || readOnly"
              class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              @click="handleDivesoftSubmit"
            >
              <span v-if="loading" class="inline-block animate-spin">
                <i class="fas fa-spinner"></i>
              </span>
              {{ loading ? 'Fetching...' : 'Fetch' }}
            </button>
          </div>
        </div>

        <!-- Divesoft picker: dives fetched but not yet staged - pick which ones to import -->
        <div v-else class="flex flex-col gap-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Choose which dive(s) to import. Nothing is staged yet.
          </p>
          <DivesoftDiveList
            :dives="divesoftPickerItems ?? []"
            @stage="handleDivesoftStageSelected"
            @cancel="divesoftPickerItems = null"
          />
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
                  Shearwater auto-merge: Add a <strong>+</strong> in front of the dive number in
                  the Shearwater Cloud app before exporting to auto-merge the uploaded dive into an
                  existing dive with the same number.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Review step: nothing has been persisted yet, review and confirm each staged dive -->
      <div v-else class="flex flex-col gap-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Nothing has been saved yet - review each dive below, adjust the site or attach it to an
          existing dive if needed, then commit it.
        </p>
        <p v-if="stageErrors.length" class="text-sm text-red-600">
          Some dives could not be parsed: {{ stageErrors.join('; ') }}
        </p>

        <!-- Fast path: skip reviewing each dive individually when the guesses are good enough. -->
        <div
          v-if="quickImportEligible.length > 0"
          class="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 p-3"
        >
          <p class="text-sm text-emerald-900 dark:text-emerald-100">
            {{ quickImportEligible.length }} of {{ stagedImports.length }} dive(s) are ready to
            import as-is.
          </p>
          <button
            type="button"
            :disabled="quickImporting || readOnly"
            class="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
            @click="quickImportAll"
          >
            {{ quickImporting ? 'Importing...' : `Import ${quickImportEligible.length} now` }}
          </button>
        </div>

        <PendingImportRow
          v-for="summary in stagedImports"
          :key="summary.id"
          :summary="summary"
          @committed="onCommitted"
          @discarded="onDiscarded"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useNavigation } from '@/composables/useNavigation'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import { toast } from 'vue-sonner'
import PendingImportRow from '@/components/dive/import/PendingImportRow.vue'
import DivesoftDiveList, {
  type DivesoftDiveListItem,
} from '@/components/dive/import/DivesoftDiveList.vue'
import type {
  DiveWithoutProfiles,
  StageImportResult,
  PendingImportSummary,
  PendingImportCommitRequest,
} from '@/lib/types/dive'
import { resolveImporterUrl } from '@/lib/globals/url/resolveUrl'
import {
  listDivesoftDiveIds,
  listDivesoftSharedDiveIds,
  getDivesoftDive,
  extractDivesoftDiveId,
  type DivesoftDiveJson,
} from '@/lib/divesoft'
import axios from 'axios'

const { safeBack, router } = useNavigation()
const { postWithToken } = useApi()
const { readOnly } = useReadOnlyMode()

const mode = ref<'files' | 'divesoft'>('files')

const files = ref<File[]>([])
const status = ref('')
const errors = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const divesoftPickerItems = ref<DivesoftDiveListItem[] | null>(null)

const divesoftToken = ref('')
const divesoftDiveInput = ref('')

const stagedImports = ref<PendingImportSummary[]>([])
const stageErrors = ref<string[]>([])

const handleDrop = (e: DragEvent) => {
  if (readOnly.value) return
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

/** Shared handling of a successful `StageImportResult` response, for either import path. */
const handleStageSuccess = (res: StageImportResult, toastId: string | number) => {
  toast.dismiss(toastId)
  stageErrors.value = res.errors ?? []
  if (res.staged.length === 0) {
    status.value = res.errors.length ? 'Error: Nothing could be imported.' : 'No dives found.'
    toast.error(status.value)
    return
  }
  stagedImports.value = res.staged
  toast.success(`Parsed ${res.staged.length} dive(s) - review and commit below`)
}

/** Shared handling of a failed stage request, for either import path. */
const handleStageError = (err: unknown, toastId: string | number) => {
  toast.dismiss(toastId)
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as
      | { title?: string; detail?: string }
      | StageImportResult
    if ('staged' in data && 'errors' in data) {
      status.value = `Error: Could not parse ${data.errors.length} dive(s): \n${data.errors.join('\n')}`
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
  if (readOnly.value) return
  status.value = ''
  if (!files.value.length) {
    status.value = 'Error: Please add at least one file.'
    return
  }

  loading.value = true
  const toastId = toast.loading('Uploading dive files... This may take a few minutes.', {
    duration: 10000,
  })

  try {
    const formDataObj = new FormData()
    files.value.forEach((f) => formDataObj.append('file', f))

    const res = (
      await postWithToken<StageImportResult, FormData>(
        resolveImporterUrl(`/v1/import`),
        formDataObj,
        {},
        null,
      )
    ).data
    handleStageSuccess(res, toastId)
    if (res.staged.length > 0) {
      files.value = []
    }
  } catch (err) {
    handleStageError(err, toastId)
  } finally {
    loading.value = false
  }
}

/** Actually stages the given raw Divesoft dive JSON(s) via the backend - shared by both the
 * single-dive-id path (stages immediately) and the picker's "Stage selected" (stages only the
 * dives the user checked). */
const stageDivesoftDives = async (
  dives: DivesoftDiveJson[],
  toastId: string | number,
): Promise<void> => {
  toast.loading('Parsing...', { id: toastId })
  const res = (
    await postWithToken<StageImportResult, { dives: DivesoftDiveJson[] }>(
      resolveImporterUrl('/v1/import/divesoft'),
      { dives },
    )
  ).data
  handleStageSuccess(res, toastId)
  if (res.staged.length > 0) {
    divesoftToken.value = ''
    divesoftDiveInput.value = ''
    divesoftPickerItems.value = null
  }
}

const handleDivesoftSubmit = async () => {
  if (readOnly.value) return
  status.value = ''
  const token = divesoftToken.value.trim()
  if (!token) {
    status.value = 'Error: Please paste your wetnotes.com access token.'
    return
  }

  loading.value = true
  const toastId = toast.loading('Fetching your dive(s) from wetnotes.com...', {
    duration: 10000,
  })

  try {
    const diveIdInput = divesoftDiveInput.value.trim()
    if (diveIdInput) {
      // A specific dive was requested directly - stage it immediately, no picker needed.
      const dive = await getDivesoftDive(token, extractDivesoftDiveId(diveIdInput))
      await stageDivesoftDives([dive], toastId)
      return
    }

    // No specific dive requested - fetch every dive (own and shared) so the user can pick which
    // ones to actually import, rather than staging everything unconditionally.
    const [ownIds, sharedIds] = await Promise.all([
      listDivesoftDiveIds(token),
      listDivesoftSharedDiveIds(token),
    ])
    const toFetch = [
      ...ownIds.map((id) => ({ id, isShared: false })),
      ...sharedIds.map((id) => ({ id, isShared: true })),
    ]
    const items: DivesoftDiveListItem[] = []
    for (const [index, { id, isShared }] of toFetch.entries()) {
      toast.loading(`Fetching dive ${index + 1} of ${toFetch.length}...`, { id: toastId })
      items.push({ id, isShared, json: await getDivesoftDive(token, id) })
    }
    toast.dismiss(toastId)
    divesoftPickerItems.value = items
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
      toast.dismiss(toastId)
      const message = 'Your wetnotes.com access token is invalid or expired. Please paste a fresh one.'
      toast.error(message)
      status.value = `Error: ${message}`
    } else {
      handleStageError(err, toastId)
    }
  } finally {
    loading.value = false
  }
}

const handleDivesoftStageSelected = async (dives: DivesoftDiveJson[]) => {
  if (readOnly.value) return
  loading.value = true
  const toastId = toast.loading('Staging selected dive(s)...', { duration: 10000 })
  try {
    await stageDivesoftDives(dives, toastId)
  } catch (err) {
    handleStageError(err, toastId)
  } finally {
    loading.value = false
  }
}

const onCommitted = (pendingImportId: number, dive: DiveWithoutProfiles) => {
  const wasLast = stagedImports.value.length === 1
  stagedImports.value = stagedImports.value.filter((s) => s.id !== pendingImportId)
  if (wasLast) {
    router.push({ name: 'DiveView', params: { diveId: dive.id } })
  }
}

const onDiscarded = (pendingImportId: number) => {
  stagedImports.value = stagedImports.value.filter((s) => s.id !== pendingImportId)
}

// "Good enough" fast path: commits every staged import that already has everything it needs
// (a resolvable site guess - the one thing that's actually required) using just its own
// best-guess values, with zero per-row interaction. Anything without a usable guess is left
// staged for individual review via the existing per-row UI below, exactly as it works today -
// this doesn't replace that, it's a shortcut for when the guesses are good enough as-is.
const quickImporting = ref(false)
const quickImportEligible = computed(() => stagedImports.value.filter((s) => !!s.siteNameGuess))

const quickImportAll = async () => {
  const eligible = quickImportEligible.value
  if (eligible.length === 0 || quickImporting.value || readOnly.value) return
  quickImporting.value = true
  const toastId = toast.loading(`Importing ${eligible.length} dive(s)...`)
  try {
    const results = await Promise.allSettled(
      eligible.map((summary) =>
        postWithToken<DiveWithoutProfiles, PendingImportCommitRequest>(
          resolveImporterUrl(`/v1/import/pending/${summary.id}/commit`),
          {},
        ).then((res) => ({ id: summary.id, dive: res.data })),
      ),
    )
    const succeededIds = new Set<number>()
    let lastDive: DiveWithoutProfiles | null = null
    for (const result of results) {
      if (result.status === 'fulfilled') {
        succeededIds.add(result.value.id)
        lastDive = result.value.dive
      } else {
        console.error('Quick-import failed for a pending import', result.reason)
      }
    }
    stagedImports.value = stagedImports.value.filter((s) => !succeededIds.has(s.id))
    const failedCount = eligible.length - succeededIds.size
    if (failedCount === 0) {
      toast.success(`Imported ${succeededIds.size} dive(s)`)
    } else {
      toast.error(
        `Imported ${succeededIds.size} of ${eligible.length} - ${failedCount} failed, check them below`,
      )
    }
    if (stagedImports.value.length === 0 && lastDive) {
      router.push(
        succeededIds.size === 1
          ? { name: 'DiveView', params: { diveId: lastDive.id } }
          : { name: 'DiveList' },
      )
    }
  } finally {
    quickImporting.value = false
    toast.dismiss(toastId)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleDiveCreateKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDiveCreateKeydown)
})
</script>

<style scoped></style>
