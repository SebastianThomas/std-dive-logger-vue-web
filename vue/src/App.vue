<template>
  <!-- Skip to content button for accessibility -->
  <a href="#main-content" class="skip-to-content">Skip to main content</a>

  <!-- Command Palette -->
  <CommandPalette v-model="showCommandPalette" />

  <!-- Help Menu -->
  <HelpMenu v-model="showHelpMenu" />

  <!-- Leader-key indicator: Space is remapped to the vim <leader> key (see useGlobalShortcuts) -
       a brief on-screen cue that a leader sequence is armed, since otherwise pressing Space would
       silently do nothing until the next key lands. Once the sequence completes, this switches to
       showing which action just fired (lastActionLabel) for a moment before fading out, instead
       of just vanishing the instant the second key lands - too fast to actually read otherwise. -->
  <Transition name="fade">
    <div
      v-if="leaderPending || lastActionLabel"
      class="fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-lg bg-gray-900/90 dark:bg-gray-700/90 text-white text-xs font-mono shadow-lg"
    >
      <template v-if="leaderPending">␣ leader…</template>
      <template v-else>␣ {{ lastActionLabel }}</template>
    </div>
  </Transition>

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
      class="transition-all duration-300 overflow-y-auto overflow-x-hidden min-h-full min-w-0 grid-main bg-gray-100 dark:bg-gray-900 relative"
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
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'
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
const { router } = useNavigation()
const { getWithToken } = useApi()
const backgroundUploadStore = useBackgroundUploadStore()
const { updatedId: backgroundUpdatedId } = storeToRefs(backgroundUploadStore)
const { showCommandPalette, showHelpMenu, leaderPending, lastActionLabel } = useGlobalShortcuts()

// Page name shown next to the logo in the header - the route's own name is a bare PascalCase
// identifier (e.g. "DiveComputerDetail"), not something to show a user directly, so split it into
// separate words before it's glued onto "Dive Together Log ".
const route = useRoute()
const pageName = computed(() => {
  const name = route.name?.toString() ?? ''
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
})

// Helper functions
const getSavedSidebarState = (): boolean | null => {
  const saved = safeLocalStorage.getItem(SIDEBAR_STORAGE_KEY)
  return saved === null ? null : saved === 'true'
}

const saveSidebarState = (collapsed: boolean) => {
  safeLocalStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
}

// Cache the last-known custom background URL so it can be applied immediately on the next
// load, before the /v1/users/ request that confirms whether it's still current has returned.
const getCachedBackgroundUrl = (): string | null => safeLocalStorage.getItem(BACKGROUND_STORAGE_KEY)

const saveCachedBackgroundUrl = (url: string | null) => {
  if (url) {
    safeLocalStorage.setItem(BACKGROUND_STORAGE_KEY, url)
  } else {
    safeLocalStorage.removeItem(BACKGROUND_STORAGE_KEY)
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

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize)

  // Initialize theme
  themeStore.initializeTheme()

  // Initial auth check and token refresh
  authStore.tryInitialLogin()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
  min-width: 0;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
