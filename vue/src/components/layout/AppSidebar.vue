<template>
  <aside
    v-if="authStore.isLoggedIn"
    class="sidebar-bg flex flex-col transition-all duration-300 grid-sidebar"
    :style="{ width: `${sidebarWidth}px` }"
  >
    <MenuItem icon="bars" text="Collapse" :is-visible="isVisible" @action="toggleSidebar" />
    <router-link :to="{ name: 'Home' }">
      <MenuItem icon="home" text="Home" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'DiveList' }">
      <MenuItem icon="list" text="Dive List" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'DiveCreate' }">
      <MenuItem icon="pen-to-square" text="Upload Dive" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'ShareOverview' }">
      <MenuItem icon="user-group" text="Groups" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'Profile' }">
      <MenuItem icon="user-pen" text="Profile" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'MapView' }">
      <MenuItem icon="map" text="Dive Sites" :is-visible="isVisible" />
    </router-link>
    <router-link :to="{ name: 'Stats' }">
      <MenuItem icon="chart-line" text="Statistics" :is-visible="isVisible" />
    </router-link>
  </aside>
  <div v-else></div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import MenuItem from './menu/MenuItem.vue'

interface Props {
  isVisible: boolean
  sidebarWidth: number
}

defineProps<Props>()

const authStore = useAuthStore()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const toggleSidebar = () => {
  emit('toggleSidebar')
}
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
