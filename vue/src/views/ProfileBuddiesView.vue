<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <main class="max-w-5xl w-full mx-auto p-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-8">
        <ProfileTabs :user="user" />

        <section v-if="user" class="space-y-4">
          <BuddyManagement />
        </section>
        <p v-else-if="loading" class="text-center text-gray-400 py-8">
          <i class="fas fa-spinner fa-spin"></i>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ProfileTabs from '@/components/ProfileTabs.vue'
import BuddyManagement from '@/components/dive/BuddyManagement.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const { user, loading, load } = useCurrentUser()
onMounted(load)
</script>
