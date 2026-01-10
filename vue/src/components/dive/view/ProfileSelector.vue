<template>
  <div
    :class="[
      'gap-2 px-3 py-1 border text-xs',
      vertical ? 'flex flex-wrap rounded-lg w-full' : 'inline-flex items-center rounded-full'
    ]"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <span class="opacity-80">Profiles:</span>
    <label
      v-for="(profile, idx) in profiles"
      :key="profile.id"
      class="flex items-center gap-1.5 cursor-pointer"
    >
      <input
        type="checkbox"
        class="w-4 h-4 checkbox-green"
        :checked="visibleProfiles[idx]"
        @change="$emit('toggleProfile', idx)"
      />
      <span>{{ idx + 1 }}</span>
    </label>
    <button v-if="!vertical" class="align-button" title="Align profiles" @click="$emit('openAlignModal')">
      <span class="fa-lg"> <i class="fa-solid fa-arrows-left-right-to-line"></i> </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { DiveProfile } from '@/lib/types/dive'

defineProps<{
  profiles: DiveProfile[]
  visibleProfiles: boolean[]
  vertical?: boolean
}>()

defineEmits<{
  toggleProfile: [index: number]
  openAlignModal: []
}>()
</script>

<style scoped>
.checkbox-green {
  accent-color: #10b981;
}

.align-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #10b981;
  font-size: 16px;
  transition:
    transform 0.2s,
    opacity 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.align-button:hover {
  transform: scale(1.2);
  opacity: 0.8;
}

.align-button:active {
  transform: scale(0.95);
}
</style>
