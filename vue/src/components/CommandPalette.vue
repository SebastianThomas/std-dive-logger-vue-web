<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        ref="paletteRef"
        class="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden outline-none"
        tabindex="-1"
        @click.stop
        @keydown="handleGlobalKeydown"
      >
        <!-- Search Input -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="relative">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Type a command or search..."
              class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              @keydown.down.prevent="moveSelection(1)"
              @keydown.up.prevent="moveSelection(-1)"
              @keydown.enter.prevent="handleEnterInInput"
              @keydown.esc.stop="handleEscapeInInput"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
            />
            <!-- Vim Mode Indicator -->
            <div
              v-if="navigationMode === 'vim'"
              class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-mono"
              :class="
                vimMode === 'insert'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              "
            >
              {{ vimMode === 'insert' ? 'INSERT' : 'NORMAL' }}
            </div>
          </div>
        </div>

        <!-- Results -->
        <div ref="resultsRef" class="max-h-96 overflow-y-auto">
          <div v-if="filteredCommands.length === 0" class="p-8 text-center text-gray-500">
            No commands found
          </div>
          <div
            v-for="(command, index) in filteredCommands"
            :key="command.id"
            :ref="(el) => el != null && setCommandRef(el as HTMLElement, index)"
            :class="[
              'px-4 py-3 cursor-pointer transition-colors border-l-4',
              selectedIndex === index
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50',
            ]"
            @click="execute(command)"
            @mouseenter="selectedIndex = index"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ command.icon }}</span>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">{{ command.label }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ command.description }}
                  </div>
                </div>
              </div>
              <div
                v-if="command.shortcut"
                class="text-xs text-gray-400 dark:text-gray-500 font-mono"
              >
                {{ command.shortcut }}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer with hints -->
        <div
          class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <div v-if="navigationMode === 'standard'" class="flex gap-4">
            <span><kbd class="kbd">↑↓</kbd> Navigate</span>
            <span><kbd class="kbd">Enter</kbd> Execute</span>
            <span><kbd class="kbd">Esc</kbd> Close</span>
          </div>
          <div v-else-if="navigationMode === 'vim'" class="flex gap-4">
            <span v-if="vimMode === 'insert'"><kbd class="kbd">Esc</kbd> Normal mode</span>
            <template v-else>
              <span><kbd class="kbd">j/k</kbd> Navigate</span>
              <span><kbd class="kbd">i</kbd> Insert</span>
              <span><kbd class="kbd">Enter</kbd> Execute</span>
              <span><kbd class="kbd">Esc</kbd> Close</span>
            </template>
          </div>
          <div>{{ filteredCommands.length }} commands</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface Command {
  id: string
  label: string
  description: string
  icon: string
  action: () => void
  keywords?: string[]
  shortcut?: string
  category?: string
  closeOnExecute?: boolean
}

const router = useRouter()
const route = useRoute()

const isOpen = defineModel<boolean>({ required: true })
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const paletteRef = ref<HTMLDivElement | null>(null)
const resultsRef = ref<HTMLDivElement | null>(null)
const commandRefs = ref<(Element | null)[]>([])

// Navigation mode state
type NavigationMode = 'standard' | 'vim'
type VimMode = 'normal' | 'insert'

const NAVIGATION_MODE_STORAGE_KEY = 'command-palette-navigation-mode'

const getNavigationModePreference = (): NavigationMode => {
  try {
    const saved = localStorage.getItem(NAVIGATION_MODE_STORAGE_KEY)
    if (saved === 'vim' || saved === 'standard') {
      return saved as NavigationMode
    }
    return 'standard'
  } catch {
    return 'standard'
  }
}

const setNavigationModePreference = (mode: NavigationMode) => {
  try {
    localStorage.setItem(NAVIGATION_MODE_STORAGE_KEY, mode)
  } catch {
    // Silently fail
  }
}

const navigationMode = ref<NavigationMode>(getNavigationModePreference())
const vimMode = ref<VimMode>('insert')

const cycleNavigationMode = () => {
  navigationMode.value = navigationMode.value === 'standard' ? 'vim' : 'standard'
  setNavigationModePreference(navigationMode.value)
  // Reset to insert mode when switching to vim
  if (navigationMode.value === 'vim') {
    vimMode.value = 'insert'
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

// Define all available commands
const commands = computed<Command[]>(() => {
  const baseCommands: Command[] = [
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Navigate to home page',
      icon: '🏠',
      action: () => router.push({ name: 'Home' }),
      keywords: ['home', 'start'],
      category: 'navigation',
    },
    {
      id: 'nav-dives',
      label: 'Go to Dive List',
      description: 'View all your dives',
      icon: '📋',
      action: () => router.push({ name: 'DiveList' }),
      keywords: ['dives', 'list', 'all'],
      shortcut: 'L',
      category: 'navigation',
    },
    {
      id: 'nav-create',
      label: 'Create New Dive',
      description: 'Upload dive files',
      icon: '➕',
      action: () => router.push({ name: 'DiveCreate' }),
      keywords: ['create', 'new', 'upload', 'add'],
      shortcut: 'C',
      category: 'navigation',
    },
    {
      id: 'nav-map',
      label: 'Go to Map',
      description: 'View dive sites on map',
      icon: '🗺️',
      action: () => router.push({ name: 'MapView' }),
      keywords: ['map', 'sites', 'location'],
      category: 'navigation',
    },
    {
      id: 'nav-stats',
      label: 'Go to Statistics',
      description: 'View your dive statistics',
      icon: '📊',
      action: () => router.push({ name: 'Stats' }),
      keywords: ['stats', 'statistics', 'analytics'],
      category: 'navigation',
    },
    {
      id: 'nav-profile',
      label: 'Go to Profile',
      description: 'View and edit your profile',
      icon: '👤',
      action: () => router.push({ name: 'Profile' }),
      keywords: ['profile', 'account', 'settings'],
      category: 'navigation',
    },
    {
      id: 'nav-share',
      label: 'Go to Share Overview',
      description: 'Manage shared dives and groups',
      icon: '🤝',
      action: () => router.push({ name: 'ShareOverview' }),
      keywords: ['share', 'groups', 'sharing'],
      category: 'navigation',
    },
    // Actions
    {
      id: 'nav-back',
      label: 'Go Back',
      description: 'Navigate to previous page',
      icon: '⬅️',
      action: () => router.back(),
      keywords: ['back', 'previous'],
      shortcut: 'B',
      category: 'action',
    },
    {
      id: 'nav-forward',
      label: 'Go Forward',
      description: 'Navigate to next page',
      icon: '➡️',
      action: () => router.forward(),
      keywords: ['forward', 'next'],
      shortcut: 'F',
      category: 'action',
    },
    // Settings
    {
      id: 'cycle-navigation-mode',
      label: `Switch to ${navigationMode.value === 'standard' ? 'Vim' : 'Standard'} Mode`,
      description:
        navigationMode.value === 'standard'
          ? 'Enable vim-style navigation (j/k, insert mode)'
          : 'Switch to standard arrow key navigation',
      icon: '⌨️',
      action: () => cycleNavigationMode(),
      keywords: ['vim', 'keyboard', 'navigation', 'mode', 'settings', 'standard'],
      category: 'settings',
      closeOnExecute: false,
    },
  ]

  // Add context-specific commands based on current route
  const contextCommands: Command[] = []

  if (route.name === 'DiveView' && route.params.diveId) {
    contextCommands.push({
      id: 'dive-edit',
      label: 'Edit Current Dive',
      description: 'Edit this dive',
      icon: '✏️',
      action: () => router.push({ name: 'DiveEdit', params: { diveId: route.params.diveId } }),
      keywords: ['edit', 'modify', 'change'],
      shortcut: 'E',
      category: 'context',
    })
  }

  if (route.name === 'DiveList') {
    contextCommands.push({
      id: 'dive-search',
      label: 'Search Dives',
      description: 'Focus search input',
      icon: '🔍',
      action: () => {
        close()
        nextTick(() => {
          const searchInput = document.querySelector(
            'input[placeholder="Search dives..."]',
          ) as HTMLInputElement
          searchInput?.focus()
        })
      },
      keywords: ['search', 'find', 'filter'],
      shortcut: '/',
      category: 'context',
    })
  }

  return [...baseCommands, ...contextCommands]
})

const filteredCommands = computed(() => {
  if (!searchQuery.value.trim()) {
    return commands.value
  }

  const query = searchQuery.value.toLowerCase()
  return commands.value.filter((cmd) => {
    const labelMatch = cmd.label.toLowerCase().includes(query)
    const descMatch = cmd.description.toLowerCase().includes(query)
    const keywordMatch = cmd.keywords?.some((kw) => kw.toLowerCase().includes(query))
    return labelMatch || descMatch || keywordMatch
  })
})

const moveSelection = (direction: number) => {
  selectedIndex.value = Math.max(
    0,
    Math.min(filteredCommands.value.length - 1, selectedIndex.value + direction),
  )

  // Scroll selected item into view
  nextTick(() => {
    const selectedElement = commandRefs.value[selectedIndex.value]
    if (selectedElement && resultsRef.value) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  })
}

const ensureCommandRefsLength = () => {
  // Ensure commandRefs array is the same length as filtered commands
  while (commandRefs.value.length < filteredCommands.value.length) {
    commandRefs.value.push(null)
  }
  commandRefs.value.length = filteredCommands.value.length
}

const setCommandRef = (el: HTMLElement, index: number) => {
  if (el) {
    commandRefs.value[index] = el
  }
}

const executeSelected = () => {
  // Find the command by comparing against the current filtered list
  // to ensure we execute the visually selected command, not an outdated index
  const command = filteredCommands.value[selectedIndex.value]
  if (command) {
    execute(command)
  }
}

const handleEnterInInput = () => {
  // In vim mode, switch to normal mode first before executing
  if (navigationMode.value !== 'vim' || vimMode.value === 'normal') {
    executeSelected()
    return
  }
  vimMode.value = 'normal'
  searchInputRef.value?.blur()
  // Focus the palette container so it can receive keyboard events
  nextTick(() => {
    paletteRef.value?.focus()
  })
  // Then execute the selected command
  nextTick(() => {
    executeSelected()
  })
}

const execute = (command: Command) => {
  command.action()

  // Always reset search and selection
  searchQuery.value = ''
  selectedIndex.value = 0
  commandRefs.value = []

  // Only close if closeOnExecute is not explicitly set to false
  if (command.closeOnExecute !== false) {
    isOpen.value = false
    vimMode.value = 'insert' // Reset to insert mode for next open
  } else {
    // If staying open, refocus input in insert mode
    if (navigationMode.value === 'vim') {
      vimMode.value = 'insert'
    }
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

const handleEscapeInInput = () => {
  if (navigationMode.value === 'vim') {
    // In vim mode, Esc switches to normal mode
    vimMode.value = 'normal'
    searchInputRef.value?.blur()
    // Focus the palette container so it can receive keyboard events
    nextTick(() => {
      paletteRef.value?.focus()
    })
  } else {
    // In standard mode, Esc closes the palette
    close()
  }
}

const handleInputFocus = () => {
  // When input is focused, switch to insert mode in vim mode
  if (navigationMode.value === 'vim') {
    vimMode.value = 'insert'
  }
}

const handleInputBlur = () => {
  // When input loses focus in vim mode, we're in normal mode
  if (navigationMode.value === 'vim') {
    vimMode.value = 'normal'
  }
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  // In standard mode, only handle Esc when not in input
  if (navigationMode.value === 'standard') {
    if (event.key === 'Escape' && document.activeElement !== searchInputRef.value) {
      event.preventDefault()
      close()
    }
    return
  }

  // Vim mode handling
  // Only handle vim mode keys when not focused on input
  if (document.activeElement === searchInputRef.value) return

  // Normal mode vim keys
  if (vimMode.value === 'normal') {
    event.preventDefault() // Prevent default for all vim mode keys

    if (event.key === 'j') {
      moveSelection(1)
    } else if (event.key === 'k') {
      moveSelection(-1)
    } else if (event.key === 'i') {
      vimMode.value = 'insert'
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    } else if (event.key === 'Enter') {
      executeSelected()
    } else if (event.key === 'Escape') {
      close()
    }
    // h and l reserved for future horizontal navigation
    else if (event.key === 'h' || event.key === 'l') {
      // Reserved for future use
    }
  }
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
  vimMode.value = 'insert' // Reset to insert mode for next open
  commandRefs.value = [] // Clear refs
}

// Focus input when opened
watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

// Reset selection and ensure refs are properly sized when search query changes
watch(
  searchQuery,
  () => {
    selectedIndex.value = 0
    ensureCommandRefsLength()
  },
  { flush: 'sync' },
)
</script>

<style scoped>
.kbd {
  padding: 0.375rem 0.5rem;
  background-color: rgb(229 231 235);
  color: gray;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

:global(.dark) .kbd {
  background-color: rgb(55 65 81);
}
</style>
