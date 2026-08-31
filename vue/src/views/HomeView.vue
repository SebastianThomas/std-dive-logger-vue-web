<template>
  <div class="min-h-full pt-6 px-3 md:pt-10 md:px-8 pb-8">
    <div class="mx-auto w-full max-w-6xl">
      <HomeSkeleton v-if="!isInitialCheckDone" />
      <HomeDashboard v-else-if="isLoggedIn" />
      <HomeMarketing v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import HomeSkeleton from '@/components/home/HomeSkeleton.vue'
import HomeMarketing from '@/components/home/HomeMarketing.vue'

// The logged-in dashboard is code-split out of the eager entry chunk (HomeView is the one
// non-lazy route); the skeleton covers its load, and logged-in users already wait on /v1/home.
const HomeDashboard = defineAsyncComponent(
  () => import('@/components/home/HomeDashboard.vue'),
)

// Gate on isInitialCheckDone, NOT isLoggedIn - at boot isLoggedIn is briefly false for a
// returning user (until App.vue's tryInitialLogin resolves); gating on it alone flashes the
// marketing page on every reload.
const { isInitialCheckDone, isLoggedIn } = storeToRefs(useAuthStore())
</script>
