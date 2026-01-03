<template>
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
      class="transition-all duration-300 overflow-auto min-h-full min-w-full grid-main bg-gray-100 relative"
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

// Constants
const headerHeight = 80 as const
const expandedWidth = 130 as const
const collapsedWidth = 50 as const
const SM_BREAKPOINT = 640 as const

// Auth store
const authStore = useAuthStore()
const themeStore = useThemeStore()

// Page name - can be empty or use current route path
const route = useRoute()
const router = useRouter()
const pageName = computed(() => {
  return route.name?.toString() || ''
})

// Reactive state
const windowWidth = ref(window.innerWidth)
const isVisible = ref(true)
const sidebarWidth = ref<0 | 50 | 130>(0)
const showTitle = computed(() => windowWidth.value >= SM_BREAKPOINT)

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
}

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

watch(windowWidth, (newWidth) => {
  isVisible.value = newWidth >= SM_BREAKPOINT
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
