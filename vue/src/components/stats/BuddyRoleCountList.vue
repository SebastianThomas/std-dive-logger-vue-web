<template>
  <ul v-if="counts.length" class="flex flex-wrap gap-2">
    <li
      v-for="c in counts"
      :key="c.role"
      class="px-3 py-1 rounded-full text-sm bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
    >
      {{ BUDDY_ROLE_LABELS[c.role] }} <span class="opacity-70">&times;{{ c.count }}</span>
    </li>
  </ul>
  <p v-else class="text-sm text-gray-400 italic">No roles recorded.</p>
</template>

<script setup lang="ts">
import { BUDDY_ROLE_LABELS } from '@/lib/types/dive'
import type { BuddyRoleCount } from '@/lib/types/stats'

defineProps<{
  counts: BuddyRoleCount[]
}>()
</script>
