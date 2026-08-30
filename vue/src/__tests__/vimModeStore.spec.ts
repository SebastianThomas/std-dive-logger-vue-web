import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVimModeStore } from '@/stores/vimMode'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useVimModeStore', () => {
  it('defaults to off when nothing is stored', () => {
    expect(useVimModeStore().enabled).toBe(false)
  })

  it('persists on set and reads it back on a fresh store', () => {
    useVimModeStore().set(true)
    expect(localStorage.getItem('vim-mode-enabled')).toBe('true')

    setActivePinia(createPinia())
    expect(useVimModeStore().enabled).toBe(true)
  })

  it('toggle flips the value', () => {
    const store = useVimModeStore()
    store.toggle()
    expect(store.enabled).toBe(true)
    store.toggle()
    expect(store.enabled).toBe(false)
  })

  it('migrates the legacy command-palette-navigation-mode key and then clears it', () => {
    localStorage.setItem('command-palette-navigation-mode', 'vim')
    expect(useVimModeStore().enabled).toBe(true)

    useVimModeStore().set(true)
    expect(localStorage.getItem('command-palette-navigation-mode')).toBeNull()
  })

  it('treats a legacy value of "standard" as off', () => {
    localStorage.setItem('command-palette-navigation-mode', 'standard')
    expect(useVimModeStore().enabled).toBe(false)
  })
})
