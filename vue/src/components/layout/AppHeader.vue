<template>
  <header
    class="col-span-2 bg-sky-500 shadow-md px-4 sm:px-8 flex items-center justify-between z-20 grid-header"
  >
    <div class="flex items-center">
      <router-link :to="{ name: 'Home' }" class="flex items-center">
        <img
          src="/images/logo1.png"
          alt="Logo"
          class="h-16 w-16 transition-all duration-300"
        />
        <h1 v-if="showTitle" class="text-lg sm:text-xl font-bold text-white ml-4">
          Dive Together Log {{ pageName }}
        </h1>
      </router-link>
    </div>
    <div class="flex items-center space-x-2 sm:space-x-3">
      <button
        class="bg-gray-200 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-gray-300 transition-colors"
        @click="$emit('toggle-theme')"
      >
        {{ themeLabel }}
      </button>
      <button
        v-if="authStore.isLoggedIn"
        class="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-red-600 transition-colors"
        @click="handleLogout"
      >
        Log Out
      </button>
      <template v-else>
        <router-link :to="{ name: 'AuthSignup' }">
          <button
            class="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-blue-700 transition-colors"
          >
            Sign Up
          </button>
        </router-link>
        <router-link :to="{ name: 'AuthLogin' }">
          <button
            class="bg-gray-200 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-gray-300 transition-colors"
          >
            Sign In
          </button>
        </router-link>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

interface Props {
  showTitle: boolean
  pageName: string
  themeLabel: string
}

const { pageName, showTitle, themeLabel } = defineProps<Props>()

const authStore = useAuthStore()

const emit = defineEmits<{
  logout: []
  'toggle-theme': []
}>()

const handleLogout = () => {
  emit('logout')
}
</script>
