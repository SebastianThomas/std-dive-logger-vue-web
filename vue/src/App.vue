<template>
  <!-- Skip to content button for accessibility -->
  <a href="#main-content" class="skip-to-content">Skip to main content</a>

  <!-- Command Palette -->
  <CommandPalette v-model="showCommandPalette" />

  <!-- Help Menu -->
  <HelpMenu v-model="showHelpMenu" />

  <Toaster position="top-right" richColors closeButton />
  <div
    class="grid app-grid min-h-dvh w-full transition-all duration-300"
    :style="{
      gridTemplateRows: `${headerHeight}px calc(100dvh - ${headerHeight}px)`,
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
      :style="mainBackgroundStyle"
    >
      <router-view class="router-content" />
      <CopyrightNotice v-if="!customBackgroundUrl" />
    </main>
  </div>
</template>

<script setup lang="ts">
import 'vue-sonner/style.css'

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Toaster } from 'vue-sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNavigation } from '@/composables/useNavigation'
import { useApi } from '@/composables/useApi'
import { useBackgroundUploadStore } from '@/stores/backgroundUpload'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import type { User } from '@/lib/types/user'
import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import CopyrightNotice from './components/CopyrightNotice.vue'
import CommandPalette from './components/CommandPalette.vue'
import HelpMenu from './components/HelpMenu.vue'

// Constants
const headerHeight = 80 as const
const expandedWidth = 130 as const
const collapsedWidth = 50 as const
const SM_BREAKPOINT = 640 as const
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'
const BACKGROUND_STORAGE_KEY = 'custom-background-url'

// Auth store
const authStore = useAuthStore()
const themeStore = useThemeStore()
const { safeBack, safeForward, router } = useNavigation()
const { getWithToken } = useApi()
const backgroundUploadStore = useBackgroundUploadStore()
const { updatedId: backgroundUpdatedId } = storeToRefs(backgroundUploadStore)

// Page name - can be empty or use current route path
const route = useRoute()
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

// Cache the last-known custom background URL so it can be applied immediately on the next
// load, before the /v1/users/ request that confirms whether it's still current has returned.
const getCachedBackgroundUrl = (): string | null => {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    return null
  }
  try {
    return localStorage.getItem(BACKGROUND_STORAGE_KEY)
  } catch {
    return null
  }
}

const saveCachedBackgroundUrl = (url: string | null) => {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    return
  }
  try {
    if (url) {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, url)
    } else {
      localStorage.removeItem(BACKGROUND_STORAGE_KEY)
    }
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
const showHelpMenu = ref(false)
// Seeded synchronously from localStorage so the correct background shows on first paint,
// before the API request below confirms it (or replaces it, if it's since changed).
const customBackgroundUrl = ref<string | null>(getCachedBackgroundUrl())

const mainBackgroundStyle = computed(() => {
  const imageUrl = customBackgroundUrl.value || '/images/Karwela.png'
  return {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6)), url('${imageUrl}')`,
  }
})

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

// Reconciles the (possibly stale, cache-seeded) background against the server's current
// value. Only an authoritative response updates it — a transient network error just leaves
// whatever's already showing in place rather than blanking it out.
const fetchCustomBackground = async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    const fresh = res.data.customBackgroundUrl ?? null
    customBackgroundUrl.value = fresh
    saveCachedBackgroundUrl(fresh)
  } catch {
    // Keep the cached/default value that's already displayed.
  }
}

// Refetch whenever login state changes, and whenever the user uploads/resets their
// background image from the (hidden) Profile settings modal in a different component.
watch(
  () => [authStore.isLoggedIn, authStore.isInitialCheckDone] as const,
  ([isLoggedIn, initialCheckDone]) => {
    if (isLoggedIn) {
      fetchCustomBackground()
    } else if (initialCheckDone) {
      // Confirmed logged out (as opposed to "auth check still pending", which is also
      // isLoggedIn === false momentarily at boot) — clear the cache so a previous
      // account's background photo can't leak into the next session on this device.
      customBackgroundUrl.value = null
      saveCachedBackgroundUrl(null)
    }
  },
  { immediate: true },
)
watch(backgroundUpdatedId, fetchCustomBackground)

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
    safeBack()
  }
  // 'f' for forward
  if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
    safeForward()
  }
  // '?' to show help/shortcuts
  if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    showHelpMenu.value = !showHelpMenu.value
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
