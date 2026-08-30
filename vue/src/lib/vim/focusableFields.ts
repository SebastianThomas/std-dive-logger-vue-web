/**
 * DOM-facing helpers for the in-field vim mode: which elements it manages, which support caret
 * motions, and next/previous-field navigation. Kept separate from `useVimFieldNavigation.ts` so
 * the predicates are unit-testable against a plain DOM fragment.
 */
import { clampedCycleIndex } from '@/lib/utils/cycle'

/** `<input>` types that get an insert/normal sub-mode. `''` = no `type` attribute (defaults to text). */
const SCOPED_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'tel', 'password', 'number'])

/**
 * Types whose `setSelectionRange` / `selectionStart` actually work. `number` and `email` throw
 * ("failed to read the 'selectionStart' property … not applicable") in browsers and jsdom, so
 * caret motions are no-ops there while the rest of normal mode still applies.
 */
const SELECTION_CAPABLE_TYPES = new Set(['', 'text', 'search', 'url', 'tel', 'password'])

/** Form controls that are never a field-hop destination. */
const HOP_EXCLUDED_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image'])

const FIELD_SELECTOR = 'input, textarea, select'

type TextField = HTMLInputElement | HTMLTextAreaElement

const inputType = (el: HTMLInputElement): string => (el.getAttribute('type') || '').toLowerCase()

const isExempt = (el: Element): boolean => el.closest('[data-vim-exempt]') !== null

const isVisible = (el: HTMLElement): boolean => {
  if (el.hidden) return false
  if (typeof getComputedStyle !== 'function') return true
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/** True for a `<textarea>` / text-like `<input>` the vim field handler should manage. */
export function isVimEditableTarget(target: EventTarget | null): target is TextField {
  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly && !isExempt(target)
  }
  if (target instanceof HTMLInputElement) {
    return (
      SCOPED_INPUT_TYPES.has(inputType(target)) &&
      !target.disabled &&
      !target.readOnly &&
      !isExempt(target)
    )
  }
  return false
}

/** True when `setSelectionRange` is usable on this field (excludes `number` / `email`). */
export function supportsCaretMotions(el: TextField): boolean {
  return el instanceof HTMLTextAreaElement || SELECTION_CAPABLE_TYPES.has(inputType(el))
}

/** True for any visible, enabled form control that can be a next/previous-field target. */
export function isVimFocusable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (!el.matches(FIELD_SELECTOR)) return false
  if (el instanceof HTMLInputElement && HOP_EXCLUDED_INPUT_TYPES.has(inputType(el))) return false
  if ((el as HTMLInputElement).disabled) return false
  if (el.getAttribute('tabindex') === '-1') return false
  if (isExempt(el)) return false
  return isVisible(el)
}

/** Every hop-eligible field under `root`, in document order. */
export function getVimFocusableFields(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll(FIELD_SELECTOR)).filter(isVimFocusable)
}

/** The next (`dir: 1`) or previous (`dir: -1`) field after `current`, clamped (no wrap). */
export function getAdjacentField(current: HTMLElement, dir: 1 | -1): HTMLElement | null {
  const fields = getVimFocusableFields()
  const idx = fields.indexOf(current)
  if (idx === -1) return null
  const next = clampedCycleIndex(idx, fields.length, dir)
  return next === idx ? null : (fields[next] ?? null)
}
