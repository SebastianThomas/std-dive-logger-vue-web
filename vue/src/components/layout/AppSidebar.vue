<template>
  <!-- Phones: a drawer over the page (opened from the header's menu button), dimming the rest. -->
  <Transition name="fade">
    <div
      v-if="authStore.hasSession && drawer && drawerOpen"
      class="fixed inset-x-0 bottom-0 z-45 bg-black/50"
      :style="{ top: `${topOffset}px` }"
      aria-hidden="true"
      @click="toggleSidebar"
    ></div>
  </Transition>
  <aside
    v-if="authStore.hasSession"
    id="app-sidebar"
    class="sidebar-bg flex flex-col grid-sidebar"
    :class="
      drawer
        ? [
            'fixed left-0 bottom-0 z-46 w-56 overflow-y-auto shadow-2xl transition-transform duration-200',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          ]
        : 'transition-all duration-300'
    "
    :style="drawer ? { top: `${topOffset}px` } : { width: `${sidebarWidth}px` }"
    :inert="drawer && !drawerOpen"
  >
    <MenuItem
      :icon="drawer ? 'xmark' : 'bars'"
      :text="drawer ? 'Close' : 'Collapse'"
      :is-visible="isVisible"
      @action="toggleSidebar"
    />
    <router-link :to="{ name: 'Home' }">
      <MenuItem icon="home" text="Home" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'DiveList' }">
      <MenuItem icon="list" text="List" :is-visible="isVisible" />
    </router-link>
    <!-- Upload is a pure editing workflow (nothing else to do there) - unlike the other links
         below, which lead to pages that self-guard their own edit controls and stay useful to
         browse in read-only mode, this one is disabled outright rather than linked through. -->
    <router-link v-if="!readOnly" :to="{ name: 'DiveCreate' }">
      <MenuItem icon="pen-to-square" text="Upload" :is-visible="isVisible" />
    </router-link>
    <MenuItem
      v-else
      icon="pen-to-square"
      text="Upload"
      :is-visible="isVisible"
      disabled
      disabled-title="Disabled in read-only mode"
    />
    <router-link :to="{ name: 'ShareOverview' }">
      <MenuItem icon="user-group" text="Groups" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'MapView' }">
      <MenuItem icon="map" text="Sites" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'DiveSiteSuggestions' }">
      <MenuItem icon="wand-magic-sparkles" text="Suggest a site" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'TripList' }">
      <MenuItem icon="compass" text="Trip/Course" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'Stats' }">
      <MenuItem icon="chart-line" text="Statistics" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'StatsTimeline' }">
      <MenuItem icon="chart-area" text="Trends" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'TagManager' }">
      <MenuItem icon="tags" text="Tags" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'Backfill' }">
      <MenuItem icon="list-check" text="Backfill" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'Profile' }">
      <MenuItem icon="user-pen" text="Profile" :is-visible="isVisible" />
    </router-link>
  </aside>
  <div v-else></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import MenuItem from './menu/MenuItem.vue'

interface Props {
  isVisible: boolean
  sidebarWidth: number
  /** Phone layout: rendered as an overlay drawer instead of a grid column. */
  drawer?: boolean
  drawerOpen?: boolean
  /** Header height the drawer and its backdrop start below. */
  topOffset?: number
}

const props = withDefaults(defineProps<Props>(), { drawer: false, drawerOpen: false, topOffset: 0 })

const authStore = useAuthStore()
const { readOnly } = useReadOnlyMode()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const toggleSidebar = () => {
  emit('toggleSidebar')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.drawer && props.drawerOpen) toggleSidebar()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.sidebar-bg {
  background-color: #0c4a6e;
}

[data-theme='light'] .sidebar-bg {
  background-color: #0284c7;
}

[data-theme='dark'] .sidebar-bg {
  background-color: #0c4a6e;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .sidebar-bg {
    background-color: #0c4a6e;
  }
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme]) .sidebar-bg {
    background-color: #0284c7;
  }
}
</style>
