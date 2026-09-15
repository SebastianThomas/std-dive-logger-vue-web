<template>
  <section class="border-t pt-6 space-y-3">
    <h2 class="text-lg font-medium">Uploaded dive files</h2>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Keep every file you import (and each Divesoft dive's data) so your dives can be read again
      when an importer improves: values that were missing are filled in automatically, anything that
      would change existing data waits for you on the Backfill page. Files stay private to your
      account; turning this off keeps what is already stored.
    </p>

    <p v-if="!settings" class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    <div v-else class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          class="h-4 w-4 accent-blue-600"
          :checked="settings.keepImportFiles"
          :disabled="busy"
          @change="toggle(($event.target as HTMLInputElement).checked)"
        />
        Keep uploaded files
      </label>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ settings.fileCount }} {{ settings.fileCount === 1 ? 'file' : 'files' }} stored ·
        {{ formatBytes(settings.totalBytes) }}
      </span>
      <button
        v-if="settings.fileCount > 0"
        type="button"
        class="text-xs text-red-600 dark:text-red-400 underline decoration-dotted hover:no-underline"
        :disabled="busy"
        @click="showDeleteModal = true"
      >
        Delete all stored files
      </button>
    </div>

    <DeletionConfirmation
      v-model="showDeleteModal"
      title="Delete stored files"
      message="This deletes every stored dive file of your account. Your dives stay as they are, but they can no longer be re-read from their files. This cannot be undone."
      confirm-text="Delete files"
      :loading="busy"
      @confirm="deleteAll"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { formatBytes } from '@/lib/dive/importFiles'
import type { ImportFileSettings } from '@/lib/types/importFiles'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'

const { getWithToken, putWithToken, deleteWithToken } = useApi()
const settings = ref<ImportFileSettings | null>(null)
const busy = ref(false)
const showDeleteModal = ref(false)

const load = async () => {
  try {
    settings.value = (await getWithToken<ImportFileSettings>('/v1/import-files/settings')).data
  } catch (err) {
    toast.error(`Couldn't load the stored-file setting: ${extractErrorDetail(err)}`)
  }
}

const toggle = async (keep: boolean) => {
  busy.value = true
  try {
    settings.value = (
      await putWithToken<ImportFileSettings>('/v1/import-files/settings', { keepImportFiles: keep })
    ).data
    toast.success(keep ? 'Uploaded files will be kept.' : 'New uploads are no longer kept.')
  } catch (err) {
    toast.error(`Couldn't change the setting: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

const deleteAll = async () => {
  busy.value = true
  try {
    settings.value = (await deleteWithToken<ImportFileSettings>('/v1/import-files')).data
    showDeleteModal.value = false
    toast.success('Stored files deleted.')
  } catch (err) {
    toast.error(`Couldn't delete the stored files: ${extractErrorDetail(err)}`)
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>
