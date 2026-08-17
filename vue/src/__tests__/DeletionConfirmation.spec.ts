import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'

describe('DeletionConfirmation', () => {
  it('enables the confirm button immediately when no confirmation phrase is required', () => {
    const wrapper = mount(DeletionConfirmation, {
      props: { modelValue: true, title: 'Delete thing', message: 'Are you sure?' },
    })
    const confirmButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    expect(confirmButton?.attributes('disabled')).toBeUndefined()
  })

  it('keeps the confirm button disabled until the exact phrase is typed', async () => {
    const wrapper = mount(DeletionConfirmation, {
      props: {
        modelValue: true,
        title: 'Delete unit and dives',
        message: 'This deletes everything.',
        confirmationPhrase: 'rEvo',
      },
    })
    const confirmButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    expect(confirmButton?.attributes('disabled')).toBeDefined()

    const input = wrapper.get('input')
    await input.setValue('revo')
    expect(confirmButton?.attributes('disabled')).toBeDefined()

    await input.setValue('rEvo')
    expect(confirmButton?.attributes('disabled')).toBeUndefined()
  })

  it('emits confirm only when clicked while enabled', async () => {
    const wrapper = mount(DeletionConfirmation, {
      props: {
        modelValue: true,
        title: 'Delete unit and dives',
        message: 'This deletes everything.',
        confirmationPhrase: 'rEvo',
      },
    })
    const confirmButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    await confirmButton?.trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.get('input').setValue('rEvo')
    await confirmButton?.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('still requires the (trivial) confirm step for an empty-string confirmation phrase, rather than disabling the guard entirely', () => {
    // `!''` is `true` in JS - confirmEnabled must not use a bare falsy check on
    // confirmationPhrase, or an empty-string phrase would silently skip the guard altogether.
    const wrapper = mount(DeletionConfirmation, {
      props: {
        modelValue: true,
        title: 'Delete unit and dives',
        message: 'This deletes everything.',
        confirmationPhrase: '',
      },
    })
    const confirmButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    expect(confirmButton?.attributes('disabled')).toBeDefined()
  })

  it('resets the typed value each time the modal reopens', async () => {
    const wrapper = mount(DeletionConfirmation, {
      props: {
        modelValue: false,
        title: 'Delete unit and dives',
        message: 'This deletes everything.',
        confirmationPhrase: 'rEvo',
      },
    })
    await wrapper.setProps({ modelValue: true })
    await wrapper.get('input').setValue('rEvo')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })
})
