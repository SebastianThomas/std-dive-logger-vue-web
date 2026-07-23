<template>
  <div class="relative">
    <input
      :id="inputId"
      type="text"
      class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
      :value="modelValue"
      placeholder="e.g. rEvo, Poseidon SE7EN, JJ-CCR"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <!-- Suggestion dropdown: always easily reachable while typing, never blocks input -->
    <div
      v-if="showDropdown && suggestions.length"
      class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-20 max-h-48 overflow-y-auto shadow-lg"
    >
      <div
        v-for="(name, idx) in suggestions"
        :key="name"
        :class="[
          'px-3 py-2 cursor-pointer text-sm',
          idx === activeIndex
            ? 'bg-blue-100 dark:bg-gray-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-600',
        ]"
        @mousedown.prevent="selectSuggestion(name)"
      >
        {{ name }}
      </div>
    </div>

    <!-- Near-match nudge: only appears once the user has stopped typing (on blur), never mid-keystroke -->
    <div
      v-if="nearMatchSuggestion"
      class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded px-2 py-1.5"
    >
      <span class="text-amber-800 dark:text-amber-200">
        Did you mean "<strong>{{ nearMatchSuggestion }}</strong>"?
      </span>
      <button
        type="button"
        class="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        @mousedown.prevent="acceptNearMatch"
      >
        Use this
      </button>
      <button
        type="button"
        class="text-gray-500 dark:text-gray-400 hover:underline"
        @mousedown.prevent="dismissNearMatch"
      >
        Keep mine
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { findClosestMatch } from '@/lib/utils/levenshtein'

interface Props {
  modelValue: string
  inputId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { getWithToken } = useApi()

const suggestions = ref<string[]>([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
const nearMatchSuggestion = ref<string | null>(null)
// Once the user dismisses a nudge for a specific typed value, don't re-nag them about that exact
// text again — but do re-check if they go on to change it further.
const dismissedFor = ref<string | null>(null)

const fetchSuggestions = async (query: string): Promise<string[]> => {
  const trimmed = query.trim()
  if (!trimmed) return []
  try {
    const res = await getWithToken<string[]>(
      `/v1/dives/configuration/ccrUnit/autocomplete?query=${encodeURIComponent(trimmed)}`,
    )
    return res.data ?? []
  } catch {
    return []
  }
}

let suggestionFetchTimeout: ReturnType<typeof setTimeout> | undefined
const fetchSuggestionsDebounced = (query: string) => {
  if (suggestionFetchTimeout) clearTimeout(suggestionFetchTimeout)
  suggestionFetchTimeout = setTimeout(async () => {
    suggestions.value = await fetchSuggestions(query)
  }, 250)
}

const onInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  // Typing again means the user is actively correcting/composing — never interrupt that.
  nearMatchSuggestion.value = null
  activeIndex.value = -1
  showDropdown.value = true
  fetchSuggestionsDebounced(value)
}

const onFocus = () => {
  if (props.modelValue.trim()) {
    showDropdown.value = true
    fetchSuggestionsDebounced(props.modelValue)
  }
}

const selectSuggestion = (name: string) => {
  emit('update:modelValue', name)
  suggestions.value = []
  showDropdown.value = false
  nearMatchSuggestion.value = null
}

const onKeydown = (e: KeyboardEvent) => {
  if (!showDropdown.value || !suggestions.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    e.stopPropagation()
    const selected = suggestions.value[activeIndex.value]
    if (selected) selectSuggestion(selected)
  } else if (e.key === 'Escape') {
    // Closes the suggestion list. Note: callers typically also have a window-level capture
    // listener that closes the whole modal on Escape, which fires first — this just makes sure
    // the dropdown doesn't linger as stale state if that outer close is ever absent.
    showDropdown.value = false
    activeIndex.value = -1
  }
}

const onBlur = () => {
  // Delay so a mousedown on a dropdown item or a nudge button registers before we hide/check.
  setTimeout(async () => {
    showDropdown.value = false
    await checkNearMatch()
  }, 150)
}

const checkNearMatch = async () => {
  const value = props.modelValue.trim()
  if (!value || value === dismissedFor.value) {
    nearMatchSuggestion.value = null
    return
  }
  // The autocomplete endpoint does a substring match, so searching for the exact (possibly
  // typo'd) value would rarely find anything to compare against — a typo like "rEvi" doesn't
  // contain "rEvo" as a substring or vice versa. Search on a short leading prefix instead, which
  // still finds the intended candidate as long as the first couple characters are right.
  const prefixQuery = value.slice(0, Math.min(2, value.length))
  const candidates = await fetchSuggestions(prefixQuery)
  const exactMatch = candidates.some((s) => s.toLowerCase() === value.toLowerCase())
  nearMatchSuggestion.value = exactMatch ? null : findClosestMatch(value, candidates)
}

const acceptNearMatch = () => {
  if (!nearMatchSuggestion.value) return
  emit('update:modelValue', nearMatchSuggestion.value)
  nearMatchSuggestion.value = null
}

const dismissNearMatch = () => {
  dismissedFor.value = props.modelValue.trim()
  nearMatchSuggestion.value = null
}
</script>
