import { onMounted, onUnmounted } from 'vue'

/**
 * Stops `<input type="number">` from changing value when the mouse wheel scrolls over it while
 * focused - a frequent accidental edit. One capture-phase, non-passive `wheel` listener (mounted
 * once from `App.vue`); `preventDefault` only fires for the focused number input, so scrolling
 * anywhere else - including an unfocused number input - is untouched. To scroll the page while a
 * number field is focused, move the pointer a few pixels off it (same as MUI / PrimeVue).
 */
const onWheel = (e: WheelEvent) => {
  const el = document.activeElement
  if (!(el instanceof HTMLInputElement) || el.type !== 'number') return
  if (e.target !== el && !el.contains(e.target as Node | null)) return
  e.preventDefault()
}

let mountCount = 0

export function useNumberInputGuard() {
  onMounted(() => {
    if (mountCount++ === 0) {
      window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    }
  })
  onUnmounted(() => {
    if (--mountCount === 0) {
      window.removeEventListener('wheel', onWheel, { capture: true })
    }
  })
}
