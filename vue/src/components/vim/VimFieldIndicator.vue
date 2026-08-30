<template>
  <Teleport to="body">
    <div v-if="show" class="fixed z-50 pointer-events-none" :style="style">
      <VimModeBadge :mode="runtime.subMode" class="shadow-lg" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useVimModeStore } from '@/stores/vimMode'
import VimModeBadge from './VimModeBadge.vue'

/** Floats the INSERT/NORMAL badge just above the top-right corner of the focused field. */
const props = defineProps<{
  runtime: {
    subMode: 'insert' | 'normal'
    activeField: HTMLElement | null
    activeRect: DOMRect | null
  }
}>()

const { enabled } = storeToRefs(useVimModeStore())

const show = computed(
  () => enabled.value && !!props.runtime.activeField && !!props.runtime.activeRect,
)

const style = computed(() => {
  const r = props.runtime.activeRect
  if (!r) return {}
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : r.right
  return {
    top: `${Math.max(4, r.top - 9)}px`,
    right: `${Math.max(4, viewportWidth - r.right)}px`,
  }
})
</script>
