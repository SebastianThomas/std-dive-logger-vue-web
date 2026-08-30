<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        ref="panelRef"
        class="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        :style="style"
      >
        <div
          class="mb-2 flex items-center justify-between font-semibold text-gray-900 dark:text-white"
        >
          <span>Vim — in-field keys</span>
          <VimModeBadge mode="normal" />
        </div>
        <div class="space-y-1">
          <div
            v-for="row in NORMAL_HELP_ROWS"
            :key="row.label"
            class="flex items-baseline justify-between gap-3"
          >
            <span class="text-gray-600 dark:text-gray-400">{{ row.label }}</span>
            <kbd class="vim-kbd">{{ row.keys }}</kbd>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { NORMAL_HELP_ROWS } from '@/lib/vim/vimKeymap'
import VimModeBadge from './VimModeBadge.vue'

// Local `?` help popover for the in-field vim normal mode. The composable also clears
// `helpVisible` on the next keystroke / focusout; this adds an outside-click and a timeout.
const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ anchor: DOMRect | null }>()

const panelRef = ref<HTMLElement | null>(null)
const AUTO_CLOSE_MS = 6000
let timer: ReturnType<typeof setTimeout> | null = null

const style = computed(() => {
  const r = props.anchor
  if (!r || typeof window === 'undefined') {
    return { left: '50%', bottom: '1rem', transform: 'translateX(-50%)' }
  }
  const width = 288 // w-72
  const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
  return { left: `${left}px`, top: `${r.bottom + 6}px` }
})

const onPointerDown = (e: PointerEvent) => {
  if (panelRef.value && !panelRef.value.contains(e.target as Node | null)) visible.value = false
}

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

watch(visible, (open) => {
  clearTimer()
  if (open) {
    timer = setTimeout(() => (visible.value = false), AUTO_CLOSE_MS)
    // Defer so the keydown that opened this doesn't immediately count as an outside click.
    setTimeout(() => document.addEventListener('pointerdown', onPointerDown, true), 0)
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true)
  }
})

onUnmounted(() => {
  clearTimer()
  document.removeEventListener('pointerdown', onPointerDown, true)
})
</script>

<style scoped>
.vim-kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background-color: rgb(229 231 235);
  color: rgb(75 85 99);
  border-radius: 0.25rem;
  font-size: 0.7rem;
  line-height: 1rem;
  white-space: nowrap;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

:global(.dark) .vim-kbd,
:global([data-theme='dark']) .vim-kbd {
  background-color: rgb(55 65 81);
  color: rgb(209 213 219);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
