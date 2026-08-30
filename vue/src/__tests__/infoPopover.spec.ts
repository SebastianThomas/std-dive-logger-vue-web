import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import InfoPopover from '@/components/ui/InfoPopover.vue'

describe('InfoPopover', () => {
  it('toggles the panel on trigger click and shows slot content', async () => {
    const w = mount(InfoPopover, {
      props: { label: 'Terms' },
      slots: { default: '<p>glossary body</p>' },
      attachTo: document.body,
    })
    expect(w.text()).not.toContain('glossary body')

    await w.get('button').trigger('click')
    await nextTick()
    expect(w.text()).toContain('glossary body')
    expect(w.find('[role="dialog"]').exists()).toBe(true)

    await w.get('button').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    w.unmount()
  })

  it('closes on outside click and on Escape', async () => {
    const w = mount(InfoPopover, {
      slots: { default: '<p>body</p>' },
      attachTo: document.body,
    })

    await w.get('button').trigger('click')
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(false)

    await w.get('button').trigger('click')
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    w.unmount()
  })
})
