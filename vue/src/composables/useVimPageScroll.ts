import { onBeforeUnmount, onMounted } from 'vue'
import { useVimModeStore } from '@/stores/vimMode'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'

/** One j/k press - about three lines of the app's body text. */
export const VIM_SCROLL_STEP_PX = 80

const scrolls = (el: Element): boolean => {
  const overflowY = getComputedStyle(el).overflowY
  return (
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    el.scrollHeight > el.clientHeight + 1
  )
}

/**
 * The element the page actually scrolls in - most views scroll an inner panel (e.g. the edit
 * form's own scroll area), not the document: the nearest scrollable ancestor of `from` (by
 * default whatever sits in the middle of the viewport), else the document itself.
 */
export function findScrollContainer(from?: Element | null): Element | null {
  let el: Element | null =
    from ?? document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
  while (el && el !== document.documentElement) {
    if (scrolls(el)) return el
    el = el.parentElement
  }
  return document.scrollingElement
}

/** +1 for `j`, -1 for `k`; null when the key is for someone else (a field, a modifier, off). */
export function vimScrollDirection(event: KeyboardEvent, enabled: boolean): 1 | -1 | null {
  if (!enabled || event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.key !== 'j' && event.key !== 'k') return null
  const target = event.target
  if (
    isTypingTarget(target) ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return null
  }
  return event.key === 'j' ? 1 : -1
}

/**
 * Vim mode outside text fields: `j` / `k` scroll the page. Decided after the event has been
 * dispatched, so a page that uses j/k itself (the dive list's row focus, the command palette)
 * and marks the key handled with `preventDefault()` keeps it.
 */
export function useVimPageScroll() {
  const vimMode = useVimModeStore()
  const onKeydown = (event: KeyboardEvent) => {
    const direction = vimScrollDirection(event, vimMode.enabled)
    if (direction == null) return
    setTimeout(() => {
      if (event.defaultPrevented) return
      findScrollContainer()?.scrollBy({ top: direction * VIM_SCROLL_STEP_PX })
    }, 0)
  }
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
