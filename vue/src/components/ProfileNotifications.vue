<template>
  <section v-if="supported" class="border-t pt-6 space-y-3">
    <h2 class="text-lg font-medium">Notifications</h2>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Get a reminder on this device for dive anniversaries and when it's been a while since your
      last dive - paced to your own diving rhythm.
    </p>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        :class="subscribed ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'"
        :disabled="busy || permission === 'denied'"
        @click="subscribed ? disable() : enable()"
      >
        {{ subscribed ? 'Turn off on this device' : 'Enable reminders on this device' }}
      </button>
      <span v-if="permission === 'denied'" class="text-xs text-red-600 dark:text-red-400">
        Notifications are blocked in your browser settings for this site.
      </span>
      <span v-else-if="subscribed" class="text-xs text-green-600 dark:text-green-400">
        <i class="fa-solid fa-check mr-1" aria-hidden="true"></i>On for this device
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePushNotifications } from '@/composables/usePushNotifications'

const { supported, permission, subscribed, busy, refresh, enable, disable } =
  usePushNotifications()

onMounted(refresh)
</script>
