<template>
  <div class="min-h-full pt-6 px-3 md:pt-10 md:px-8 pb-8">
    <div class="mx-auto w-full max-w-6xl">
      <HomeSkeleton v-if="!isInitialCheckDone && !hasSession" />
      <HomeDashboard v-else-if="hasSession" />
      <HomeOfflineNotice v-else-if="isOffline" />
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
import HomeOfflineNotice from '@/components/home/HomeOfflineNotice.vue'

// The logged-in dashboard is code-split out of the eager entry chunk (HomeView is the one
// non-lazy route); the skeleton covers its load, and logged-in users already wait on /v1/home.
const HomeDashboard = defineAsyncComponent(
  () => import('@/components/home/HomeDashboard.vue'),
)

// hasSession, NOT isLoggedIn: a device with a cached account shows the dashboard at once (from
// its offline copy) - while still checking, and when the server can't be reached at all. Without
// one, the skeleton covers the check so the marketing page never flashes for a returning user.
const { isInitialCheckDone, hasSession, isOffline } = storeToRefs(useAuthStore())
</script>
