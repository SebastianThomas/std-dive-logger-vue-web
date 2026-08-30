import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useNumberInputGuard } from '@/composables/useNumberInputGuard'

const Host = defineComponent({
  setup: () => {
    useNumberInputGuard()
    return {}
  },
  render: () => null,
})

let wrapper: VueWrapper
let input: HTMLInputElement

const wheelOver = (el: Element) => {
  const e = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
  el.dispatchEvent(e)
  return e
}

beforeEach(() => {
  wrapper = mount(Host, { attachTo: document.body })
  input = document.createElement('input')
  document.body.appendChild(input)
})

afterEach(() => {
  wrapper.unmount()
  input.remove()
})

describe('useNumberInputGuard', () => {
  it('blocks the wheel over a focused number input', () => {
    input.type = 'number'
    input.focus()
    expect(wheelOver(input).defaultPrevented).toBe(true)
  })

  it('leaves an unfocused number input alone', () => {
    input.type = 'number'
    expect(wheelOver(input).defaultPrevented).toBe(false)
  })

  it('leaves a focused text input alone', () => {
    input.type = 'text'
    input.focus()
    expect(wheelOver(input).defaultPrevented).toBe(false)
  })
})
