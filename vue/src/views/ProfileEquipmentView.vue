<template>
  <div
    class="min-h-full flex justify-center items-start pt-2 px-1 sm:px-6 md:pt-20 md:mx-10"
  >
    <main class="max-w-5xl w-full mx-auto p-2 sm:p-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 space-y-4 md:space-y-8">
        <ProfileTabs :user="user" />

        <section v-if="user" class="space-y-4">
          <h2 class="text-lg font-semibold mb-2">Equipment Configurations</h2>
          <SuitManagement :user-id="user.id" />
          <CcrUnitManagement :user-id="user.id" />
          <DiveComputerManagement :user-id="user.id" />
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
import SuitManagement from '@/components/dive/SuitManagement.vue'
import CcrUnitManagement from '@/components/dive/CcrUnitManagement.vue'
import DiveComputerManagement from '@/components/dive/DiveComputerManagement.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const { user, loading, load } = useCurrentUser()
onMounted(load)
</script>
