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
      @focus="showFocus = true"
      @blur="onBlur"
      @keydown="onKeydown"
    />
    <div
      v-if="dropdownOpen && ac.results.value.length"
      class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg"
    >
      <div
        v-for="(name, idx) in ac.results.value"
        :key="name"
        class="px-3 py-2 cursor-pointer text-sm"
        :class="
          idx === ac.activeIndex.value
            ? 'bg-blue-100 dark:bg-gray-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-600'
        "
        @mousedown.prevent="select(name)"
      >
        {{ name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAutocomplete } from '@/composables/useAutocomplete'

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
  placeholder: 'Buddy name (Ctrl+Space for suggestions)',
  inputClass: 'w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600',
  excludeNames: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** A suggestion was clicked - callers that add-then-clear (rather than keeping the typed name
   * in place, e.g. a persistent roster-row field) should react to this instead of modelValue. */
  select: [name: string]
  enter: []
  /** The real input's own blur, forwarded since the component's template root is a wrapping div. */
  blur: []
}>()

const { getWithToken } = useApi()

const exclude = (names: string[]) => names.filter((n) => !props.excludeNames.includes(n))

const ac = useAutocomplete<string>({
  cacheKey: 'buddies',
  debounceMs: 200,
  fetch: async (q) => {
    const res = await getWithToken<string[]>(
      `/v1/dives/buddies/autocomplete?query=${encodeURIComponent(q)}`,
    )
    return exclude(res.data ?? [])
  },
  // Blank query → all of the user's buddy names, most-frequent first.
  fetchRelevant: async () => {
    const res = await getWithToken<string[]>('/v1/dives/buddies')
    return exclude(res.data ?? [])
  },
})

// The visible text lives on `modelValue` (the input is `:value="modelValue"`), so keep the
// composable's own `query` in step - it's what a Ctrl+Space fetch reads.
watch(() => props.modelValue, (v) => (ac.query.value = v), { immediate: true })

const showFocus = ref(false)
const dropdownOpen = computed(() => showFocus.value && ac.open.value)

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  ac.onInput(value)
}

const select = (name: string) => {
  ac.reset()
  showFocus.value = false
  emit('update:modelValue', name)
  emit('select', name)
}

const onKeydown = (e: KeyboardEvent) => {
  ac.onKeydown(e, { onEnter: select, onEscape: () => (showFocus.value = false) })
  if (e.key === 'Enter' && ac.activeIndex.value < 0) {
    e.preventDefault()
    emit('enter')
  }
}

const onBlur = () => {
  setTimeout(() => {
    showFocus.value = false
  }, 150)
  emit('blur')
}
</script>
