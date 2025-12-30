<template>
  <img
    v-if="previewImage && !imageLoadError"
    :src="previewImage"
    :alt="alt"
    crossorigin="anonymous"
    class="w-full h-auto object-contain cursor-pointer"
    @error="imageLoadError = true"
  />
  <div
    v-if="!previewImage || imageLoadError"
    class="w-20 flex flex-col items-center justify-center gap-1 text-xs text-gray-400 py-2"
  >
    <span>No preview</span>
    <button
      v-if="dive?.id"
      :disabled="isRegenerating"
      @click.stop="regeneratePreview"
      title="Try to regenerate preview image"
      class="px-2 py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition whitespace-nowrap"
    >
      {{ isRegenerating ? 'Generating...' : 'Try' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import type { DiveWithoutProfiles } from '@/lib/types/dive'

interface Props {
  dive?: DiveWithoutProfiles | null
}

const props = defineProps<Props>()
const { postWithToken } = useApi()

const emit = defineEmits<{
  'preview-regenerated': [dive: DiveWithoutProfiles]
}>()

const imageLoadError = ref(false)
const isRegenerating = ref(false)

const previewImage = computed(() => props.dive?.previewImage || null)
const alt = computed(() => props.dive?.site?.name || 'Dive preview')

const regeneratePreview = async () => {
  if (!props.dive?.id) return

  isRegenerating.value = true
  try {
    const res = await postWithToken<DiveWithoutProfiles>(`/v1/dives/${props.dive.id}/preview`, {})
    imageLoadError.value = false
    toast.success('Preview regenerated')
    // Emit the updated dive so parent can update the list
    emit('preview-regenerated', res.data)
  } catch (err) {
    console.error('Failed to regenerate preview', err)
    toast.error('Failed to regenerate preview')
  } finally {
    isRegenerating.value = false
  }
}
</script>

<style scoped></style>
