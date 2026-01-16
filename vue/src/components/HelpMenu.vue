<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm max-h-[80vh] overflow-y-auto"
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <h3 class="font-bold text-lg text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          <button
            @click="close"
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-auto"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3">
          <!-- Global shortcuts - Always visible -->
          <div>
            <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Global
            </h4>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Command Palette</span>
                <kbd class="kbd-small">Ctrl+P</kbd>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Back</span>
                <kbd class="kbd-small">B</kbd>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Forward</span>
                <kbd class="kbd-small">F</kbd>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Help</span>
                <kbd class="kbd-small">?</kbd>
              </div>
            </div>
          </div>

          <!-- Current page shortcuts - Always visible -->
          <div v-if="currentPageShortcuts.length > 0">
            <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              {{ currentPageLabel }}
            </h4>
            <div class="space-y-1">
              <div v-for="shortcut in currentPageShortcuts" :key="shortcut.label" class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ shortcut.label }}</span>
                <kbd class="kbd-small">{{ shortcut.key }}</kbd>
              </div>
            </div>
          </div>

          <!-- Other shortcuts - Collapsible -->
          <div v-for="section in otherSections" :key="section.name">
            <button
              @click="toggleSection(section.name)"
              class="flex items-center gap-2 w-full text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span class="text-xs">{{ expandedSections[section.name] ? '▼' : '▶' }}</span>
              {{ section.label }}
            </button>
            <div v-if="expandedSections[section.name]" class="space-y-1">
              <div v-for="shortcut in section.shortcuts" :key="shortcut.label" class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ shortcut.label }}</span>
                <kbd class="kbd-small">{{ shortcut.key }}</kbd>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            Closes in {{ remainingSeconds }}s
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'

const isOpen = defineModel<boolean>({ required: true })
const remainingSeconds = ref(10)
const route = useRoute()
const expandedSections = ref<Record<string, boolean>>({})

let timeoutId: ReturnType<typeof setTimeout> | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

const allShortcuts = {
  DiveView: [
    { label: 'Edit Dive', key: 'E' },
    { label: 'Share Dive', key: 'S' },
    { label: 'Delete Dive', key: 'Shift+D' },
    { label: 'Link Dive', key: 'L' },
  ],
  DiveList: [
    { label: 'Search', key: '/' },
    { label: 'Toggle Shared', key: 'A' },
    { label: 'Bulk Actions', key: 'M' },
  ],
}

const currentPageLabel = computed(() => {
  const pageName = route.name?.toString() || ''
  if (pageName === 'DiveView') return 'Dive View'
  if (pageName === 'DiveList') return 'Dive List'
  return ''
})

const currentPageShortcuts = computed(() => {
  const pageName = route.name?.toString() || ''
  if (pageName === 'DiveView') return allShortcuts.DiveView
  if (pageName === 'DiveList') return allShortcuts.DiveList
  return []
})

const otherSections = computed(() => {
  const pageName = route.name?.toString() || ''
  const sections = []
  
  if (pageName !== 'DiveView') {
    sections.push({
      name: 'DiveView',
      label: 'Dive View',
      shortcuts: allShortcuts.DiveView,
    })
  }
  
  if (pageName !== 'DiveList') {
    sections.push({
      name: 'DiveList',
      label: 'Dive List',
      shortcuts: allShortcuts.DiveList,
    })
  }
  
  return sections
})

const toggleSection = (sectionName: string) => {
  expandedSections.value[sectionName] = !expandedSections.value[sectionName]
}

const close = () => {
  isOpen.value = false
  if (timeoutId) clearTimeout(timeoutId)
  if (intervalId) clearInterval(intervalId)
}

const startTimer = () => {
  remainingSeconds.value = 10

  // Update countdown every second
  intervalId = setInterval(() => {
    remainingSeconds.value -= 1
  }, 1000)

  // Close after 10 seconds
  timeoutId = setTimeout(() => {
    isOpen.value = false
    if (intervalId) clearInterval(intervalId)
  }, 10000)
}

const stopTimer = () => {
  if (timeoutId) clearTimeout(timeoutId)
  if (intervalId) clearInterval(intervalId)
}

// Watch for menu open/close
watch(isOpen, (open) => {
  if (open) {
    startTimer()
  } else {
    stopTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.kbd-small {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: rgb(229 231 235);
  color: rgb(75 85 99);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-weight: 500;
}

:global(.dark) .kbd-small {
  background-color: rgb(55 65 81);
  color: rgb(209 213 219);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
