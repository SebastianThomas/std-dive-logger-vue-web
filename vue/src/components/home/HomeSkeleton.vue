<template>
  <div class="space-y-3 animate-pulse">
    <div class="h-7 w-48 rounded bg-white/20"></div>
    <div class="flex flex-wrap gap-2">
      <div v-for="i in 4" :key="i" class="h-16 w-28 rounded-xl bg-white/15"></div>
    </div>
    <div class="h-24 rounded-xl bg-white/10"></div>
    <div class="h-40 rounded-xl bg-white/10"></div>
  </div>
</template>

<script setup lang="ts">
// Neutral placeholder shown (a) before the initial auth check resolves - so a returning user
// never flashes the marketing page - and (b) while HomeDashboard's own /v1/home fetch is pending.
</script>
