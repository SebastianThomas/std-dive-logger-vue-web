<template>
  <div class="flex flex-row flex-wrap xl:flex-col gap-3 items-center justify-center">
    <button class="control-btn close-btn" @click="$emit('close')">Close</button>
    <ProfileSelector
      v-if="profiles.length > 1"
      :profiles="profiles"
      :visible-profiles="visibleProfiles"
      :vertical="profileSelectorVertical"
      class="xl:vertical-profile-selector"
      @toggle-profile="$emit('toggleProfile', $event)"
    />
    <AnalyticsToggle 
      :show-segments="showSegments" 
      @update:show-segments="$emit('update:showSegments', $event)" 
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import ProfileSelector from '@/components/dive/view/ProfileSelector.vue'
import AnalyticsToggle from '@/components/dive/view/AnalyticsToggle.vue'
import type { DiveProfile } from '@/lib/types/dive'

defineProps<{
  profiles: DiveProfile[]
  visibleProfiles: boolean[]
  showSegments: boolean
}>()

defineEmits<{
  close: []
  toggleProfile: [index: number]
  'update:showSegments': [value: boolean]
}>()

// Track if screen is xl or larger
const isXlScreen = ref(false)

const checkScreenSize = () => {
  if (typeof window !== 'undefined') {
    isXlScreen.value = window.innerWidth >= 1280 // xl breakpoint
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkScreenSize)
  }
})

const profileSelectorVertical = computed(() => isXlScreen.value)
</script>

<style scoped>
.control-btn {
  padding: 8px 12px;
  font-size: 14px;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  transition:
    background 0.2s,
    opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.close-btn {
  background: #dc2626;
}

.close-btn:hover {
  background: #b91c1c;
}

</style>
