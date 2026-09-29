<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <main class="max-w-xl w-full mx-auto p-6">
      <div class="bg-white rounded-xl shadow-lg p-8 space-y-4">
        <p class="text-5xl" aria-hidden="true">🤿</p>
        <h1 class="text-2xl font-bold text-gray-800">Page not found</h1>
        <p class="text-sm text-gray-600">
          There's nothing at this address — it may have moved, or the link may be wrong.
        </p>
        <p class="text-xs font-mono break-all rounded bg-gray-100 text-gray-600 px-3 py-2">
          {{ attemptedPath }}
        </p>
        <div class="flex flex-wrap gap-3 pt-2">
          <router-link
            :to="{ name: 'Home' }"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white! hover:bg-blue-700"
          >
            Back to home
          </router-link>
          <router-link
            :to="{ name: 'DiveList' }"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Go to dive list
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// The raw path the user actually asked for. Shown verbatim so a mistyped or stale link is
// recognisable at a glance; interpolated as text, never as markup.
const attemptedPath = computed(() => route.fullPath)
</script>

<!-- Every colour class above is one global.css already remaps under [data-theme='dark'] (bg-white,
     bg-gray-100, text-gray-600, text-gray-800, border-gray-300, hover:bg-gray-100), so both
     themes follow the toggle without `dark:` utilities (which follow data-theme too since
     2026-09-28). The h1 and the secondary button need an explicit text-gray-800: an uncoloured
     element inherits a colour pinned light further up the tree. -->
