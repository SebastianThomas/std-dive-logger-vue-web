<template>
  <InfoCardRow v-if="files.length">
    <InfoCard title="Source files">
      <ul class="space-y-2 min-w-0">
        <li
          v-for="entry in files"
          :key="entry.file.id"
          class="flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate" :title="fileDisplayName(entry.file)">
              {{ fileDisplayName(entry.file) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ IMPORT_SOURCE_LABELS[entry.file.source] }} · {{ scopeLabel(entry.file) }} ·
              {{ formatBytes(entry.file.sizeBytes) }} · uploaded
              {{ formatDate(entry.file.createdAt, zoneId) }}
            </p>
            <p v-if="usedFor(entry)" class="text-xs text-gray-500 dark:text-gray-400">
              {{ usedFor(entry) }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 text-sm text-blue-600 hover:underline disabled:opacity-50"
            :disabled="downloading === entry.file.id"
            @click="download(entry.file)"
          >
            <i class="fa-solid fa-download mr-1" aria-hidden="true"></i>Download
          </button>
        </li>
      </ul>
    </InfoCard>
  </InfoCardRow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { formatDate } from '@/lib/utils/timeUtils'
import InfoCard from '@/components/InfoCard.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import {
  IMPORT_SOURCE_LABELS,
  fileDisplayName,
  formatBytes,
  scopeLabel,
  usedForLabel,
} from '@/lib/dive/importFiles'
import type { DiveSourceFile, ImportFileInfo } from '@/lib/types/importFiles'
import type { DiveProfile } from '@/lib/types/dive'

const props = defineProps<{
  diveId: number
  profiles: DiveProfile[]
  zoneId?: string | null
}>()

const { getWithToken } = useApi()
const files = ref<DiveSourceFile[]>([])
const downloading = ref<number | null>(null)

const refresh = async () => {
  try {
    files.value =
      (await getWithToken<DiveSourceFile[]>(`/v1/import-files/dives/${props.diveId}`)).data ?? []
  } catch (err) {
    // Only shown to the dive's owner; a failure here must not disturb the dive view.
    console.error('Failed to load source files:', err)
    files.value = []
  }
}

const usedFor = (entry: DiveSourceFile) =>
  usedForLabel(
    entry,
    (id) => props.profiles.find((p) => p.id === id)?.diveComputer?.customIdentifier,
  )

const download = async (file: ImportFileInfo) => {
  downloading.value = file.id
  try {
    const res = await getWithToken<Blob>(`/v1/import-files/${file.id}/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileDisplayName(file)
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.error(`Couldn't download the file: ${extractErrorDetail(err)}`)
  } finally {
    downloading.value = null
  }
}

watch(() => props.diveId, refresh, { immediate: true })

defineExpose({ refresh })
</script>
