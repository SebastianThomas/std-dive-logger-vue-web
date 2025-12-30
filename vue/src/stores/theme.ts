import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')

  const initializeTheme = () => {
    const storedTheme = localStorage.getItem('theme-preference') as Theme | null
    if (storedTheme) {
      theme.value = storedTheme
    } else {
      // Auto-detect system preference on first visit
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()
  }

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem('theme-preference', theme.value)
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
