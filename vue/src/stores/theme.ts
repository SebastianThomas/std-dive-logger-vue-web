import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')

  const initializeTheme = () => {
    const hasWindow = typeof window !== 'undefined'
    const hasLocalStorage = hasWindow && typeof window.localStorage?.getItem === 'function'

    const storedTheme = hasLocalStorage
      ? (window.localStorage.getItem('theme-preference') as Theme | null)
      : null

    if (storedTheme) {
      theme.value = storedTheme
    } else if (hasWindow && typeof window.matchMedia === 'function') {
      // Auto-detect system preference on first visit when available
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }

    applyTheme()
  }

  const applyTheme = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme.value)
    }
    if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
      window.localStorage.setItem('theme-preference', theme.value)
    }
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    applyTheme()
  }

  return {
    theme,
    initializeTheme,
    toggleTheme,
  }
})
