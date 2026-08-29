<template>
  <div class="space-y-2">
    <!-- Selected tags -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-1.5">
      <TagBadge
        v-for="tag in modelValue"
        :key="tag.id"
        :name="tag.name"
        :auto-detected="false"
        removable
        @remove="removeTag(tag.id)"
      />
    </div>
    <p v-else class="text-xs text-gray-400 dark:text-gray-500">No tags selected</p>

    <!-- Input -->
    <div class="relative">
      <input
        :value="ac.query.value"
        type="text"
        placeholder="Search or create tag… (Ctrl+Space for suggestions)"
        class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
        @input="ac.onInput(($event.target as HTMLInputElement).value)"
        @keydown="onKeydown"
        @focus="showFocus = true"
        @blur="hideDropdown"
      />

      <!-- Suggestions dropdown -->
      <div
        v-if="dropdownOpen && (ac.results.value.length || canCreate)"
        class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg"
      >
        <div
          v-for="(tag, idx) in ac.results.value"
          :key="tag.id"
          class="px-3 py-2 cursor-pointer text-sm flex items-center gap-2"
          :class="
            idx === ac.activeIndex.value
              ? 'bg-blue-100 dark:bg-gray-600'
              : 'hover:bg-gray-100 dark:hover:bg-gray-600'
          "
          @mousedown.prevent="selectTag(tag)"
        >
          <TagBadge :name="tag.name" :auto-detected="!!tag.autoDetectRule" />
        </div>
        <div
          v-if="canCreate"
          class="px-3 py-2 text-sm text-purple-700 dark:text-purple-300 italic"
          :class="creating ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'"
          @mousedown.prevent="createAndSelect"
        >
          <LoadingSpinner v-if="creating" size="xs" />
          {{ creating ? 'Creating…' : `+ Create "${ac.query.value.trim()}"` }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { useAutocomplete } from '@/composables/useAutocomplete'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import type { TagDefinition } from '@/lib/types/dive'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import TagBadge from './TagBadge.vue'

const props = defineProps<{
  modelValue: TagDefinition[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TagDefinition[]]
}>()

const { getWithToken, postWithToken } = useApi()

const selectedIds = computed(() => new Set(props.modelValue.map((t) => t.id)))

const ac = useAutocomplete<TagDefinition>({
  cacheKey: 'tags',
  fetch: async (q) => {
    const res = await getWithToken<TagDefinition[]>(`/v1/tags?query=${encodeURIComponent(q)}`)
    return (res.data ?? []).filter((t) => !selectedIds.value.has(t.id))
  },
  // Blank query → the user's own tags, most-used first (see TagController).
  fetchRelevant: async () => {
    const res = await getWithToken<TagDefinition[]>('/v1/tags')
    return (res.data ?? []).filter((t) => !selectedIds.value.has(t.id))
  },
})

const showFocus = ref(false)
const dropdownOpen = computed(() => showFocus.value && ac.open.value)

const canCreate = computed(() => {
  const trimmed = ac.query.value.trim()
  if (!trimmed) return false
  const already = props.modelValue.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  const inResults = ac.results.value.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  return !already && !inResults
})

const selectTag = (tag: TagDefinition) => {
  if (!selectedIds.value.has(tag.id)) {
    emit('update:modelValue', [...props.modelValue, tag])
  }
  ac.reset()
}

const creating = ref(false)
const createAndSelect = async () => {
  const name = ac.query.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const res = await postWithToken<TagDefinition>(`/v1/tags?name=${encodeURIComponent(name)}`)
    selectTag(res.data)
  } catch (e) {
    console.error('Failed to create tag', e)
    toast.error(`Failed to create tag: ${extractErrorDetail(e)}`)
  } finally {
    creating.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  ac.onKeydown(e, {
    onEnter: (tag) => selectTag(tag),
    onEscape: () => (showFocus.value = false),
  })
  // Plain Enter with nothing highlighted: pick a sole suggestion, else create.
  if (e.key === 'Enter' && ac.activeIndex.value < 0) {
    e.preventDefault()
    const first = ac.results.value[0]
    if (ac.results.value.length === 1 && first) selectTag(first)
    else if (canCreate.value) createAndSelect()
  }
}

const removeTag = (id: number) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t.id !== id),
  )
}

const hideDropdown = () => {
  setTimeout(() => {
    showFocus.value = false
  }, 150)
}
</script>
