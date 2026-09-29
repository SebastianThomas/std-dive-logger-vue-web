<template>
  <div
    class="rounded-xl bg-white bg-opacity-90 shadow-md px-4 py-8 text-center text-sm"
    :style="{ color: 'var(--foreground)' }"
  >
    <i class="fa-solid fa-cloud-arrow-down text-2xl opacity-60" aria-hidden="true"></i>
    <p class="mt-2 font-medium">{{ title }}</p>
    <p class="mt-1 opacity-75">It loads by itself as soon as you're back online.</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), {
  title: "This isn't available offline",
})
</script>
