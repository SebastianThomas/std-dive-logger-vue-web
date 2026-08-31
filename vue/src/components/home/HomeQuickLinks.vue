<template>
  <nav class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
    <RouterLink
      v-for="link in links"
      :key="link.name"
      :to="{ name: link.name }"
      class="flex flex-col items-center gap-1.5 rounded-xl bg-white bg-opacity-90 px-2 py-3 text-center shadow-md hover:bg-opacity-100 hover:shadow-lg transition"
      :style="{ color: 'var(--foreground)' }"
    >
      <i :class="`fa fa-${link.icon} text-lg text-blue-600`" aria-hidden="true"></i>
      <span class="text-xs font-medium">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
// The daily-driver shortcuts only - the sidebar already links every route. Icons match the
// sidebar's FontAwesome classes.
const links = [
  { name: 'DiveList', label: 'Dives', icon: 'list' },
  { name: 'DiveCreate', label: 'Log a dive', icon: 'pen-to-square' },
  { name: 'MapView', label: 'Sites', icon: 'map' },
  { name: 'TripList', label: 'Trips', icon: 'compass' },
  { name: 'Stats', label: 'Statistics', icon: 'chart-line' },
  { name: 'Profile', label: 'Profile', icon: 'user-pen' },
] as const
</script>
