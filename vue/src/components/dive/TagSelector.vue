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
        v-model="inputValue"
        type="text"
        placeholder="Search or create tag…"
        class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm"
        @input="handleInput"
        @keydown.enter.prevent="handleEnter"
        @focus="showDropdown = true"
        @blur="hideDropdown"
      />

      <!-- Suggestions dropdown -->
      <div
        v-if="showDropdown && (suggestions.length || canCreate)"
        class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg"
      >
        <div
          v-for="tag in suggestions"
          :key="tag.id"
          class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex items-center gap-2"
          @mousedown.prevent="selectTag(tag)"
        >
          <TagBadge :name="tag.name" :auto-detected="!!tag.autoDetectRule" />
        </div>
        <div
          v-if="canCreate"
          class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-purple-700 dark:text-purple-300 italic"
          @mousedown.prevent="createAndSelect"
        >
          + Create "{{ inputValue.trim() }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { resolveAutocompleteUrl } from '@/lib/globals/url/resolveUrl'
import type { TagDefinition } from '@/lib/types/dive'
import TagBadge from './TagBadge.vue'

const props = defineProps<{
  modelValue: TagDefinition[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TagDefinition[]]
}>()

const { getWithToken, postWithToken } = useApi()

const inputValue = ref('')
const suggestions = ref<TagDefinition[]>([])
const showDropdown = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectedIds = computed(() => new Set(props.modelValue.map((t) => t.id)))

const canCreate = computed(() => {
  const trimmed = inputValue.value.trim()
  if (!trimmed) return false
  const already = props.modelValue.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  const inSuggestions = suggestions.value.some(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
  )
  return !already && !inSuggestions
})

const handleInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const query = inputValue.value.trim()
  if (!query) {
    suggestions.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const res = await getWithToken<TagDefinition[]>(
        resolveAutocompleteUrl(`/v1/autocomplete/tag?query=${encodeURIComponent(query)}`),
      )
      suggestions.value = (res.data ?? []).filter((t) => !selectedIds.value.has(t.id))
    } catch {
      suggestions.value = []
    }
  }, 250)
}

const selectTag = (tag: TagDefinition) => {
  if (!selectedIds.value.has(tag.id)) {
    emit('update:modelValue', [...props.modelValue, tag])
  }
  inputValue.value = ''
  suggestions.value = []
}

const createAndSelect = async () => {
  const name = inputValue.value.trim()
  if (!name) return
  try {
    const res = await postWithToken<TagDefinition>(`/v1/tags?name=${encodeURIComponent(name)}`)
    selectTag(res.data)
  } catch (e) {
    console.error('Failed to create tag', e)
    toast.error('Failed to create tag. Please try again.')
  }
}

const handleEnter = () => {
  const first = suggestions.value[0]
  if (suggestions.value.length === 1 && first) {
    selectTag(first)
  } else if (canCreate.value) {
    createAndSelect()
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
    showDropdown.value = false
  }, 150)
}
</script>
