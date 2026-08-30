import { defineStore } from 'pinia'
import { ref } from 'vue'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'

/**
 * App-wide "vim mode" preference. When on, a focused text field gains an insert/normal sub-mode
 * (see `composables/useVimFieldNavigation.ts`) and the Command Palette switches to j/k list
 * navigation. Persisted across sessions - unlike `readOnlyMode`, which is deliberately session-only.
 *
 * Migrates the old CommandPalette-only key (`command-palette-navigation-mode`, values
 * `'vim'`/`'standard'`) the first time this store initialises, then removes it.
 */
const STORAGE_KEY = 'vim-mode-enabled'
const LEGACY_KEY = 'command-palette-navigation-mode'

const loadInitial = (): boolean => {
  const saved = safeLocalStorage.getItem(STORAGE_KEY)
  if (saved === 'true') return true
  if (saved === 'false') return false
  return safeLocalStorage.getItem(LEGACY_KEY) === 'vim'
}

export const useVimModeStore = defineStore('vimMode', () => {
  const enabled = ref<boolean>(loadInitial())

  const set = (value: boolean) => {
    enabled.value = value
    safeLocalStorage.setItem(STORAGE_KEY, String(value))
    // One-time cleanup: the pref lives under STORAGE_KEY now.
    safeLocalStorage.removeItem(LEGACY_KEY)
  }

  const toggle = () => set(!enabled.value)

  return { enabled, set, toggle }
})
