<template>
  <div class="graph-modal-overlay">
    <div class="graph-modal-card">
      <button class="close-btn" @click="emit('close')">Close</button>
      <DiveGraphView :profiles="profiles" :dive-id="diveId" :show-grid-toggle="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import DiveGraphView from '@/components/dive/view/DiveGraphView.vue'
import type { DiveProfile } from '@/lib/types/dive'

type Props = {
  profiles: DiveProfile[]
  diveId: number
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.graph-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.graph-modal-card {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 30;
  padding: 8px 12px;
  font-size: 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.graph-area {
  position: relative;
  flex: 1;
  padding: 12px;
}

.graph-grid-toggle {
  position: absolute;
  top: -2.5rem;
  right: 16px;
  z-index: 25;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--card-bg, #ffffff);
  color: var(--foreground, #111827);
  border: 1px solid rgba(209, 213, 219, 0.8);
  border-radius: 9999px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}

[data-theme='dark'] .graph-modal-card {
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

[data-theme='dark'] .graph-grid-toggle {
  border-color: #334155;
  background-color: var(--card-bg, #111827);
  color: var(--foreground, #e5e7eb);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
</style>
