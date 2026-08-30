import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import {
  useVimFieldNavigation,
  __resetVimRuntime,
} from '@/composables/useVimFieldNavigation'
import { useVimModeStore } from '@/stores/vimMode'

const Host = defineComponent({
  setup: () => ({ ...useVimFieldNavigation() }),
  render: () => null,
})

interface VimRuntime {
  subMode: 'insert' | 'normal'
  activeField: HTMLElement | null
  helpVisible: boolean
}

let wrapper: VueWrapper
let store: ReturnType<typeof useVimModeStore>
let fields: HTMLElement

const runtime = (): VimRuntime => (wrapper.vm as unknown as { runtime: VimRuntime }).runtime

const mkInput = (attrs: Partial<HTMLInputElement> & { type?: string } = {}): HTMLInputElement => {
  const el = document.createElement('input')
  el.type = attrs.type ?? 'text'
  if (attrs.value != null) el.value = attrs.value
  fields.appendChild(el)
  return el
}

const press = (el: Element, key: string, opts: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })
  el.dispatchEvent(e)
  return e
}

beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
  __resetVimRuntime()
  store = useVimModeStore()
  fields = document.createElement('div')
  document.body.appendChild(fields)
  wrapper = mount(Host, { global: { plugins: [pinia] }, attachTo: document.body })
})

afterEach(() => {
  wrapper.unmount()
  fields.remove()
})

describe('useVimFieldNavigation - disabled / insert transparency', () => {
  it('does nothing while vim mode is off', () => {
    const input = mkInput({ value: 'hello' })
    input.focus()
    const e = press(input, 'j')
    expect(e.defaultPrevented).toBe(false)
    expect(runtime().subMode).toBe('insert')
  })

  it('starts a focused field in insert mode and stays transparent', () => {
    store.enabled = true
    const input = mkInput({ value: 'hello' })
    input.focus()
    expect(runtime().subMode).toBe('insert')
    expect(runtime().activeField).toBe(input)
    expect(press(input, 'a').defaultPrevented).toBe(false)
  })

  it('Escape switches insert -> normal', () => {
    store.enabled = true
    const input = mkInput({ value: 'hello' })
    input.focus()
    const e = press(input, 'Escape')
    expect(e.defaultPrevented).toBe(true)
    expect(runtime().subMode).toBe('normal')
  })
})

describe('useVimFieldNavigation - normal mode', () => {
  const focusNormal = (value = 'hello'): HTMLInputElement => {
    store.enabled = true
    const input = mkInput({ value })
    input.focus()
    input.setSelectionRange(0, 0)
    press(input, 'Escape')
    return input
  }

  it('h/l move the caret and swallow the key', () => {
    const input = focusNormal('hello')
    const e = press(input, 'l')
    expect(e.defaultPrevented).toBe(true)
    expect(input.selectionStart).toBe(1)
    press(input, 'l')
    press(input, 'h')
    expect(input.selectionStart).toBe(1)
  })

  it('0 and $ jump to the line ends', () => {
    const input = focusNormal('hello world')
    input.setSelectionRange(4, 4)
    press(input, '$')
    expect(input.selectionStart).toBe(11)
    press(input, '0')
    expect(input.selectionStart).toBe(0)
  })

  it('swallows an unbound printable key without changing the value', () => {
    const input = focusNormal('hello')
    const e = press(input, 'x')
    expect(e.defaultPrevented).toBe(true)
    expect(input.value).toBe('hello')
  })

  it('i returns to insert; A returns to insert at line end', () => {
    const input = focusNormal('hello')
    press(input, 'i')
    expect(runtime().subMode).toBe('insert')

    press(input, 'Escape')
    input.setSelectionRange(0, 0)
    press(input, 'A')
    expect(runtime().subMode).toBe('insert')
    expect(input.selectionStart).toBe(5)
  })

  it('j/k move across textarea lines keeping the column', async () => {
    store.enabled = true
    const ta = document.createElement('textarea')
    ta.value = 'abcdef\nxy\nabcdef'
    fields.appendChild(ta)
    ta.focus()
    ta.setSelectionRange(4, 4)
    press(ta, 'Escape')
    press(ta, 'j')
    expect(ta.selectionStart).toBe(9) // clamped to end of "xy"
    press(ta, 'j')
    expect(ta.selectionStart).toBe(14) // restored to column 4 on the long line
  })

  it('n / } hop to the next field and stay in normal; p / { hop back', async () => {
    store.enabled = true
    const a = mkInput({ value: 'a' })
    const b = mkInput({ value: 'b' })
    a.focus()
    press(a, 'Escape')
    press(a, 'n')
    await nextTick()
    expect(document.activeElement).toBe(b)
    expect(runtime().subMode).toBe('normal')
    press(b, '{')
    await nextTick()
    expect(document.activeElement).toBe(a)
  })

  it('? opens the local help and does not toggle any global help', () => {
    const input = focusNormal('hi')
    press(input, '?')
    expect(runtime().helpVisible).toBe(true)
  })

  it('Escape leaves the field and does not preventDefault (a modal could still close)', () => {
    const input = focusNormal('hi')
    const e = press(input, 'Escape')
    expect(e.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('useVimFieldNavigation - opt-outs and edge cases', () => {
  it('ignores a [data-vim-exempt] field', () => {
    store.enabled = true
    const wrap = document.createElement('div')
    wrap.setAttribute('data-vim-exempt', '')
    const input = document.createElement('input')
    wrap.appendChild(input)
    fields.appendChild(wrap)
    input.focus()
    const e = press(input, 'Escape')
    expect(e.defaultPrevented).toBe(false)
    expect(runtime().subMode).toBe('insert')
  })

  it('lets the first Escape through when an autocomplete popup is open (data-ac-open)', () => {
    store.enabled = true
    const input = mkInput({ value: 'al' })
    input.setAttribute('data-ac-open', '')
    input.focus()
    const e = press(input, 'Escape')
    expect(e.defaultPrevented).toBe(true) // native value-revert suppressed
    expect(runtime().subMode).toBe('insert') // but not switched to normal yet
  })

  it('does not intercept keys on a focused <select>', () => {
    store.enabled = true
    const sel = document.createElement('select')
    fields.appendChild(sel)
    sel.focus()
    expect(press(sel, 'j').defaultPrevented).toBe(false)
    expect(runtime().subMode).toBe('insert')
  })

  it('ignores IME composition and modifier combos', () => {
    store.enabled = true
    const input = mkInput({ value: 'x' })
    input.focus()
    press(input, 'Escape')
    expect(press(input, 'x', { isComposing: true }).defaultPrevented).toBe(false)
    expect(press(input, 'a', { metaKey: true }).defaultPrevented).toBe(false)
  })
})
