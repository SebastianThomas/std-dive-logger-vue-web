<template>
  <!-- Skip to content button for accessibility -->
  <a href="#main-content" class="skip-to-content">Skip to main content</a>

  <!-- Command Palette -->
  <CommandPalette v-model="showCommandPalette" />

  <Toaster position="top-right" richColors closeButton />
  <div
    class="grid app-grid min-h-screen w-full transition-all duration-300"
    :style="{
      gridTemplateRows: `${headerHeight}px calc(100vh - ${headerHeight}px)`,
      gridTemplateColumns: `${sidebarWidth}px calc(100vw - ${sidebarWidth}px)`,
    }"
  >
    <AppHeader :show-title="showTitle" :page-name="pageName" @logout="handleLogout" />

    <AppSidebar
      :is-visible="isVisible"
      :sidebar-width="sidebarWidth"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- Main content -->
    <main
      id="main-content"
      class="transition-all duration-300 overflow-auto min-h-full min-w-full grid-main bg-gray-100 dark:bg-gray-900 relative"
    >
      <router-view class="router-content" />
      <CopyrightNotice />
    </main>
  </div>
</template>

<script setup lang="ts">
import 'vue-sonner/style.css'

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import CopyrightNotice from './components/CopyrightNotice.vue'
import CommandPalette from './components/CommandPalette.vue'

// Constants
const headerHeight = 80 as const
const expandedWidth = 130 as const
const collapsedWidth = 50 as const
const SM_BREAKPOINT = 640 as const
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

// Auth store
const authStore = useAuthStore()
const themeStore = useThemeStore()

// Page name - can be empty or use current route path
const route = useRoute()
const router = useRouter()
const pageName = computed(() => {
  return route.name?.toString() || ''
})

// Helper functions
const getSavedSidebarState = (): boolean | null => {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    return null
  }
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return saved === null ? null : saved === 'true'
  } catch {
    return null
  }
}

const saveSidebarState = (collapsed: boolean) => {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    return
  }
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  } catch {
    // Silently fail if localStorage is not available
  }
}

const getInitialSidebarState = (): boolean => {
  const savedState = getSavedSidebarState()

  // If there's a saved state, use it
  if (savedState !== null) {
    return !savedState // isVisible is the inverse of collapsed
  }

  // Default: collapsed (not visible) on small screens, visible on large screens
  return window.innerWidth >= SM_BREAKPOINT
}

// Reactive state
const windowWidth = ref(window.innerWidth)
const isVisible = ref(getInitialSidebarState())
const sidebarWidth = ref<0 | 50 | 130>(0)
const showTitle = computed(() => windowWidth.value >= SM_BREAKPOINT)
const showCommandPalette = ref(false)

// Methods
const handleLogout = async () => {
  const url = resolveUrl('/api/auth/logout')

  try {
    await axios.post(url, undefined, { withCredentials: true })
  } catch (err) {
    console.error('Network error during logout:', err)
  }

  authStore.logout()
  console.log('Logged out')
  router.push({ name: 'Home' })
}

const toggleSidebar = () => {
  isVisible.value = !isVisible.value
  saveSidebarState(!isVisible.value)
}

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

watch(windowWidth, (newWidth) => {
  // Only auto-collapse/expand on resize if there's no saved preference
  const savedState = getSavedSidebarState()
  if (savedState === null) {
    isVisible.value = newWidth >= SM_BREAKPOINT
  }
})

watch(
  [isVisible, () => authStore.isLoggedIn],
  () => {
    if (authStore.isLoggedIn) {
      sidebarWidth.value = isVisible.value ? expandedWidth : collapsedWidth
    } else {
      sidebarWidth.value = 0
    }
  },
  { immediate: true },
)

// Global keyboard shortcuts
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // Ctrl+P / Cmd+P for command palette - always works
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
    event.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
    return
  }

  // Don't trigger shortcuts when typing in input/textarea
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return
  }

  // 'b' for back
  if (event.key.toLowerCase() === 'b' && !event.ctrlKey && !event.metaKey) {
    router.back()
  }
  // 'f' for forward
  if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
    router.forward()
  }
  // '?' to show help/shortcuts
  if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
    console.log(
      'Available shortcuts: Ctrl+P=command palette, b=back, f=forward, e=edit, s=share, d=delete (in DiveView)',
    )
  }
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleGlobalKeydown)

  // Initialize theme
  themeStore.initializeTheme()

  // Initial auth check and token refresh
  authStore.tryInitialLogin()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.app-grid {
  grid-template-areas:
    'header header'
    'sidebar main';
}

.grid-header {
  grid-area: header;
}

.grid-sidebar {
  grid-area: sidebar;
}

.grid-main {
  grid-area: main;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background: linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6)), url('/images/Karwela.png');
  background-size: cover;
}

.router-content {
  position: relative;
  z-index: 10;
}
</style>

<style>
:root.hide-header .app-grid {
  grid-template-rows: 0 1fr !important;
}

:root.hide-header .grid-header {
  display: none !important;
}

.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
  border-radius: 0 0 4px 0;
}

.skip-to-content:focus {
  top: 0;
}
</style>
