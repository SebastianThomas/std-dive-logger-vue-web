<template>
  <div class="flex items-center gap-6">
    <div
      class="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-semibold shrink-0"
    >
      {{ user?.name?.charAt(0).toUpperCase() ?? '?' }}
    </div>

    <div>
      <h1 class="text-2xl font-semibold">User Profile</h1>
      <p v-if="user" class="text-gray-700 dark:text-gray-300 mt-1">
        <strong>Username:</strong> {{ user.name }}
      </p>
    </div>
  </div>

  <nav class="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
      :class="
        route.name === tab.name
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      "
    >
      {{ tab.label }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { type User } from '@/lib/types/user'

defineProps<{ user: User | null }>()

const route = useRoute()

const tabs = [
  { name: 'Profile', label: 'Account' },
  { name: 'ProfileEquipment', label: 'Equipment' },
  { name: 'ProfileBuddies', label: 'Buddies' },
  { name: 'ProfileCertifications', label: 'Certifications' },
] as const
</script>
