<template>
  <section v-if="supported" class="border-t pt-6 space-y-3">
    <h2 class="text-lg font-medium">Notifications</h2>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Get a reminder on this device for dive anniversaries and when it's been a while since your
      last dive - paced to your own diving rhythm.
    </p>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        :class="subscribed ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'"
        :disabled="busy || permission === 'denied' || isOffline"
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

    <label v-if="subscribed" class="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        class="mt-1"
        :checked="logbookSync"
        :disabled="busy || isOffline"
        @change="setLogbookSync(($event.target as HTMLInputElement).checked)"
      />
      <span>
        Keep this device's offline copy up to date
        <span class="block text-xs text-gray-600 dark:text-gray-400">
          When your logbook changes elsewhere, your latest stats and dives are sent here so they
          show without a connection.
          <template v-if="apple">
            iPhone and iPad show a quiet "Logbook synced" notice - Apple doesn't allow invisible
            updates.
          </template>
        </span>
      </span>
    </label>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { useAuthStore } from '@/stores/auth'

const {
  supported,
  permission,
  subscribed,
  busy,
  logbookSync,
  apple,
  refresh,
  enable,
  disable,
  setLogbookSync,
} = usePushNotifications()
const { isOffline } = storeToRefs(useAuthStore())

onMounted(refresh)
</script>
