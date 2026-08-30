import { onMounted, onUnmounted, reactive } from 'vue'
import { useVimModeStore } from '@/stores/vimMode'
import {
  getAdjacentField,
  isVimEditableTarget,
  supportsCaretMotions,
} from '@/lib/vim/focusableFields'
import * as motions from '@/lib/vim/fieldMotions'

/**
 * App-wide in-field vim mode. One capture-phase `window` keydown listener (plus focus/scroll
 * bookkeeping), mounted once from `App.vue`. When `useVimModeStore().enabled` and a text
 * `<input>`/`<textarea>` is focused, the field gains an insert/normal sub-mode:
 *
 * - insert: fully transparent (native typing, autocomplete, form submit) except `Escape` → normal.
 * - normal: swallows printable keys; `h/j/k/l/w/b/e/0/^/$` move the caret, `i/a/I/A` return to
 *   insert, `n`/`}` and `p`/`{` hop to the next/previous field, `?` opens the local help popover,
 *   `Esc` leaves the field.
 *
 * The palette opts out via `[data-vim-exempt]`; autocomplete popups get the first `Escape` (see
 * the `data-ac-open` check) so it closes the dropdown before the second `Escape` enters normal.
 */
type SubMode = 'insert' | 'normal'
type TextField = HTMLInputElement | HTMLTextAreaElement
type InsertMotion = 'i' | 'a' | 'I' | 'A'

interface VimFieldRuntime {
  subMode: SubMode
  activeField: HTMLElement | null
  activeRect: DOMRect | null
  helpVisible: boolean
  goalColumn: number | null
}

const runtime = reactive<VimFieldRuntime>({
  subMode: 'insert',
  activeField: null,
  activeRect: null,
  helpVisible: false,
  goalColumn: null,
})

// Keys worth inspecting while in insert mode - everything else short-circuits immediately.
const INSERT_INTERESTING = new Set(['Escape', '}', '{', '?'])
// Keys left entirely to the browser / component handlers while in normal mode.
const PASSTHROUGH = new Set([
  'Tab',
  'Enter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

let pendingHopMode: SubMode | null = null
let mountCount = 0
let store: ReturnType<typeof useVimModeStore> | null = null
let rafId: number | null = null

const isEnabled = (): boolean => store?.enabled ?? false

const caretOf = (el: TextField): number => el.selectionStart ?? el.value.length

const setCaret = (el: TextField, pos: number) => {
  if (!supportsCaretMotions(el)) return
  try {
    el.setSelectionRange(pos, pos)
  } catch {
    /* selection API not applicable for this input type */
  }
}

const recomputeRect = () => {
  runtime.activeRect = runtime.activeField?.getBoundingClientRect() ?? null
}

const resetRuntime = () => {
  runtime.subMode = 'insert'
  runtime.activeField = null
  runtime.activeRect = null
  runtime.helpVisible = false
  runtime.goalColumn = null
}

const enterNormal = () => {
  runtime.subMode = 'normal'
  runtime.goalColumn = null
  recomputeRect()
}

const enterInsertAt = (el: TextField, mode: InsertMotion) => {
  setCaret(el, motions.insertCaretFor(mode, el.value, caretOf(el)))
  runtime.subMode = 'insert'
  runtime.helpVisible = false
}

const hop = (from: HTMLElement, dir: 1 | -1) => {
  const target = getAdjacentField(from, dir)
  if (!target) return
  pendingHopMode = 'normal'
  target.focus()
}

/** Runs a normal-mode key. Returns false for an unbound key (caller swallows it either way). */
const runNormalKey = (key: string, el: TextField): boolean => {
  const text = el.value
  const caret = caretOf(el)
  switch (key) {
    case 'h':
      setCaret(el, motions.horizontal(text, caret, -1))
      return true
    case 'l':
      setCaret(el, motions.horizontal(text, caret, 1))
      return true
    case 'w':
      setCaret(el, motions.nextWordStart(text, caret))
      return true
    case 'b':
      setCaret(el, motions.prevWordStart(text, caret))
      return true
    case 'e':
      setCaret(el, motions.wordEnd(text, caret))
      return true
    case '0':
      setCaret(el, motions.lineStart(text, caret))
      return true
    case '^':
      setCaret(el, motions.firstNonBlank(text, caret))
      return true
    case '$':
      setCaret(el, motions.lineEnd(text, caret))
      return true
    case 'j':
    case 'k': {
      if (!(el instanceof HTMLTextAreaElement)) return true // single-line: no vertical move
      const r = motions.verticalTextarea(text, caret, key === 'j' ? 1 : -1, runtime.goalColumn)
      runtime.goalColumn = r.goalColumn
      setCaret(el, r.caret)
      return true
    }
    case 'i':
    case 'a':
    case 'I':
    case 'A':
      enterInsertAt(el, key)
      return true
    case 'n':
    case '}':
      hop(el, 1)
      return true
    case 'p':
    case '{':
      hop(el, -1)
      return true
    case '?':
      runtime.helpVisible = true
      return true
    default:
      return false
  }
}

const onKeydownCapture = (e: KeyboardEvent) => {
  if (!isEnabled()) return
  // Fast path: while typing (insert mode) almost every key is none of our business.
  if (runtime.subMode === 'insert' && !INSERT_INTERESTING.has(e.key)) return
  if (e.isComposing || e.keyCode === 229) return

  const el = e.target
  if (!isVimEditableTarget(el)) {
    // A focused <select> has no caret / sub-mode, but still honours field-hop + local help.
    if (el instanceof HTMLSelectElement && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === '}' || e.key === '{') {
        e.preventDefault()
        e.stopImmediatePropagation()
        hop(el, e.key === '}' ? 1 : -1)
      } else if (e.key === '?') {
        e.preventDefault()
        e.stopImmediatePropagation()
        runtime.helpVisible = true
      }
    }
    return
  }

  if (runtime.subMode === 'insert') {
    if (e.key !== 'Escape') return
    if (el.hasAttribute('data-ac-open')) {
      // An autocomplete popup is open - let this Escape bubble to the field's own handler to
      // close it (just stop the native value-revert). The next Escape enters normal.
      e.preventDefault()
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    enterNormal()
    return
  }

  // --- normal mode ---
  if (runtime.helpVisible) runtime.helpVisible = false
  if (e.ctrlKey || e.metaKey || e.altKey) return // Cmd+C/A, Ctrl+P, Ctrl+Space, Ctrl+N/P, …
  if (PASSTHROUGH.has(e.key)) return
  if (e.key === 'Escape') {
    el.blur() // not prevented/stopped: a host modal's own Esc handler still closes it
    return
  }
  e.preventDefault()
  e.stopImmediatePropagation()
  if (e.key !== 'j' && e.key !== 'k') runtime.goalColumn = null
  runNormalKey(e.key, el)
}

const onFocusIn = (e: FocusEvent) => {
  if (!isEnabled()) {
    pendingHopMode = null
    return
  }
  const el = e.target
  if (isVimEditableTarget(el)) {
    runtime.activeField = el
    runtime.subMode = pendingHopMode ?? 'insert'
    runtime.goalColumn = null
    recomputeRect()
  } else {
    runtime.activeField = null
    runtime.activeRect = null
    runtime.helpVisible = false
  }
  pendingHopMode = null
}

const onFocusOut = () => {
  // Note: a hop does focus() (→ focusout then focusin); pendingHopMode is deliberately untouched
  // here so the following focusin can consume it.
  runtime.activeField = null
  runtime.activeRect = null
  runtime.subMode = 'insert'
  runtime.helpVisible = false
  runtime.goalColumn = null
}

const onScrollOrResize = () => {
  if (!isEnabled() || !runtime.activeField || rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    recomputeRect()
  })
}

const attach = () => {
  store = useVimModeStore()
  window.addEventListener('keydown', onKeydownCapture, true)
  window.addEventListener('focusin', onFocusIn, true)
  window.addEventListener('focusout', onFocusOut, true)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
}

const detach = () => {
  window.removeEventListener('keydown', onKeydownCapture, true)
  window.removeEventListener('focusin', onFocusIn, true)
  window.removeEventListener('focusout', onFocusOut, true)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  store = null
  pendingHopMode = null
  resetRuntime()
}

export function useVimFieldNavigation() {
  onMounted(() => {
    if (mountCount++ === 0) attach()
  })
  onUnmounted(() => {
    if (--mountCount === 0) detach()
  })
  return { runtime }
}

/** Test-only: clear the module singleton between specs. */
export function __resetVimRuntime() {
  pendingHopMode = null
  resetRuntime()
}
