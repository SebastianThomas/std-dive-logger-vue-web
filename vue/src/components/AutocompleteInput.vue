<template>
  <div class="relative w-full">
    <input
      v-model="inputValue"
      type="text"
      :placeholder="label"
      @input="handleInputChange"
      @focus="showSuggestions = true"
      @blur="hideSuggestions"
      @keydown="handleKeyDown"
      class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    />

    <!-- Suggestions dropdown -->
    <div
      v-if="showSuggestions && options.length > 0"
      class="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 z-10 max-h-48 overflow-y-auto shadow-lg"
    >
      <div
        v-for="option in options"
        :key="option.id"
        @click="selectOption(option)"
        class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
      >
        {{ option.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { resolveAutocompleteUrl } from '@/lib/globals/url/resolveUrl'

interface Option {
  id: number
  name: string
}

interface Props {
  suburl: 'user' | 'group' | 'site'
  label: string
  closeOnEnter?: boolean
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnEnter: true,
  closeOnEscape: true,
})

const emit = defineEmits<{
  selected: [option: Option]
  enter: []
  escape: []
}>()

const { getWithToken } = useApi()
const inputValue = ref('')
const options = ref<Option[]>([])
const showSuggestions = ref(false)
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const handleInputChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  inputValue.value = target.value

  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }

  if (!inputValue.value.trim()) {
    options.value = []
    return
  }

  debounceTimeout = setTimeout(async () => {
    try {
      const res = await getWithToken<{ result: Option[] } | Option[]>(
        resolveAutocompleteUrl(
          `/v1/autocomplete/${props.suburl}?query=${encodeURIComponent(inputValue.value)}`,
        ),
      )

      if (Array.isArray(res.data)) {
        options.value = res.data
      } else {
        options.value = res.data.result || []
      }
    } catch (err) {
      console.error('Failed to fetch autocomplete options', err)
      options.value = []
    }
  }, 300)
}

const selectOption = (option: Option) => {
  emit('selected', option)
  inputValue.value = option.name
  options.value = []
  showSuggestions.value = false
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 100)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && props.closeOnEnter) {
    event.preventDefault()
    emit('enter')
  } else if (event.key === 'Escape' && props.closeOnEscape) {
    event.preventDefault()
    emit('escape')
  }
}
</script>

<style scoped></style>
