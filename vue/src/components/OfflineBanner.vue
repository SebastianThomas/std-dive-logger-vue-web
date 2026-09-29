<template>
  <!-- Phones: headline + Retry on one row, the explanation full-width below; wider: one line. -->
  <div class="dtl-offline-banner sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs sm:text-sm" role="status">
    <span class="order-1 font-semibold">
      <i class="fa-solid fa-plug-circle-xmark mr-1" aria-hidden="true"></i>{{ headline }}
    </span>
    <span class="order-3 min-w-0 basis-full sm:order-2 sm:basis-auto sm:flex-1">
      <template v-if="savedAt">Showing your logbook as of {{ savedAt }} · </template>the rest
      loads when you're back online.
    </span>
    <button
      type="button"
      class="dtl-offline-banner__retry order-2 ml-auto shrink-0 rounded-md px-2 py-0.5 font-medium disabled:opacity-60 sm:order-3"
      :disabled="retrying"
      @click="retry"
    >
      <i class="fa-solid fa-rotate-right mr-1" :class="{ 'fa-spin': retrying }" aria-hidden="true"></i>
      Retry
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOfflineStore } from '@/stores/offline'
import { formatSavedAt } from '@/lib/offline/formatSavedAt'

const auth = useAuthStore()
const offline = useOfflineStore()
const retrying = ref(false)

// navigator.onLine is only trustworthy when false; "true" can still mean no route to the server.
const headline = computed(() =>
  typeof navigator !== 'undefined' && navigator.onLine === false
    ? "You're offline"
    : "Can't reach the server",
)

const savedAt = computed(() =>
  formatSavedAt(
    offline.mergedHome?.savedAt ?? offline.divesPage?.savedAt ?? offline.owner?.lastOnlineAt,
  ),
)

const retry = async () => {
  retrying.value = true
  try {
    await auth.retryNow()
  } finally {
    retrying.value = false
  }
}
</script>

<style>
/* Custom colours, themed by [data-theme] - the same rule the `dark:` variant follows (see
   src/styles/global.css). */
.dtl-offline-banner {
  background: #fffbeb;
  color: #78350f;
  border-bottom: 1px solid #fcd34d;
}
.dtl-offline-banner__retry {
  background: #fde68a;
}
[data-theme='dark'] .dtl-offline-banner {
  background: #3b2a0c;
  color: #fde68a;
  border-bottom-color: #b45309;
}
[data-theme='dark'] .dtl-offline-banner__retry {
  background: #78350f;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .dtl-offline-banner {
    background: #3b2a0c;
    color: #fde68a;
    border-bottom-color: #b45309;
  }
  :root:not([data-theme]) .dtl-offline-banner__retry {
    background: #78350f;
  }
}
</style>
