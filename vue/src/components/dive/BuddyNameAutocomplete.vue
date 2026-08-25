<template>
  <div class="relative">
    <input
      :id="id"
      :value="modelValue"
      type="text"
      :class="inputClass"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="showDropdown = true"
      @blur="onBlur"
      @keydown.enter.prevent="$emit('enter')"
    />
    <div
      v-if="showDropdown && suggestions.length"
      class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg"
    >
      <div
        v-for="name in suggestions"
        :key="name"
        class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
        @mousedown.prevent="select(name)"
      >
        {{ name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

interface Props {
  modelValue: string
  id?: string
  placeholder?: string
  inputClass?: string
  /** Names already picked elsewhere (e.g. already on this dive/roster) - filtered out of the
   * suggestion list so a name can't be suggested twice. */
  excludeNames?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  placeholder: 'Buddy name',
  inputClass:
    'w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600',
  excludeNames: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** A suggestion was clicked - callers that add-then-clear (rather than keeping the typed name
   * in place, e.g. a persistent roster-row field) should react to this instead of modelValue. */
  select: [name: string]
  enter: []
  /** The real input's own blur, forwarded since the component's template root is a wrapping div
   * (needed for the dropdown's positioning), so a plain `@blur` on the component itself would
   * fire on that div, never the input inside it. */
  blur: []
}>()

const { getWithToken } = useApi()

const suggestions = ref<string[]>([])
const showDropdown = ref(false)
let debounce: ReturnType<typeof setTimeout> | null = null

const fetchSuggestions = (query: string) => {
  if (debounce) clearTimeout(debounce)
  const q = query.trim()
  if (!q) {
    suggestions.value = []
    return
  }
  debounce = setTimeout(async () => {
    try {
      const res = await getWithToken<string[]>(
        `/v1/dives/buddies/autocomplete?query=${encodeURIComponent(q)}`,
      )
      suggestions.value = (res.data ?? []).filter((n) => !props.excludeNames.includes(n))
    } catch {
      suggestions.value = []
    }
  }, 200)
}

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  fetchSuggestions(value)
}

const select = (name: string) => {
  suggestions.value = []
  showDropdown.value = false
  // Always updates modelValue too, so a plain v-model consumer (a persistent field, e.g. one
  // roster row) already gets the picked name with no extra wiring. A consumer that instead wants
  // "add to a list, then clear the input" (e.g. the dive-buddies picker) listens for @select and
  // does that itself, overwriting this in the same tick.
  emit('update:modelValue', name)
  emit('select', name)
}

const hideDropdown = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

const onBlur = () => {
  hideDropdown()
  emit('blur')
}
</script>
