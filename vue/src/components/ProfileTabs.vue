<template>
  <!-- Single root so the parent view's `space-y-8` reliably spaces this whole block from the
       content below it - the nav used to carry `-mb-px`, which won that margin and left the next
       heading flush against the tab underline. -->
  <div class="space-y-6 sm:space-y-8">
    <div class="flex items-center gap-4 sm:gap-6">
      <div
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl sm:text-2xl font-semibold shrink-0"
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

    <!-- Scrolls horizontally rather than clipping when the four tabs don't fit (narrow phones). -->
    <nav
      class="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="
          route.name === tab.name
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        "
      >
        {{ tab.label }}
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type User } from '@/lib/types/user'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'

defineProps<{ user: User | null }>()

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'Profile', label: 'Account' },
  { name: 'ProfileEquipment', label: 'Equipment' },
  { name: 'ProfileBuddies', label: 'Buddies' },
  { name: 'ProfileCertifications', label: 'Certifications' },
] as const

// Left/Right arrows and vim h/l move between adjacent tabs (clamped, not wrapping - these read
// more like pages than a cyclic carousel). Ignored while typing (e.g. renaming a buddy, editing
// certification notes) so a stray 'l' or 'h' keystroke doesn't unexpectedly navigate away.
const moveTab = (delta: 1 | -1) => {
  const currentIndex = tabs.findIndex((t) => t.name === route.name)
  if (currentIndex === -1) return
  const nextIndex = currentIndex + delta
  const next = tabs[nextIndex]
  if (next) router.push({ name: next.name })
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'h') {
    event.preventDefault()
    moveTab(-1)
  } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'l') {
    event.preventDefault()
    moveTab(1)
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
