import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DivesoftDiveList, {
  type DivesoftDiveListItem,
} from '@/components/dive/import/DivesoftDiveList.vue'
import type { DivesoftDiveJson } from '@/lib/divesoft'

const makeItem = (
  id: string,
  isShared: boolean,
  startDate: string,
  site = `Site ${id}`,
): DivesoftDiveListItem => ({
  id,
  isShared,
  json: { diveAndMixes: { dive: { startDate, site } } } as DivesoftDiveJson,
})

describe('DivesoftDiveList', () => {
  it('splits dives into own/shared sections sorted descending by date', () => {
    const wrapper = mount(DivesoftDiveList, {
      props: {
        dives: [
          makeItem('own-old', false, '2024-01-01T00:00:00Z'),
          makeItem('own-new', false, '2024-06-01T00:00:00Z'),
          makeItem('shared-old', true, '2024-02-01T00:00:00Z'),
          makeItem('shared-new', true, '2024-07-01T00:00:00Z'),
        ],
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Your dives (2)')
    expect(text).toContain('Shared with you (2)')

    const ownLabels = wrapper.findAll('section')[0]!.findAll('li').map((li) => li.text())
    expect(ownLabels[0]).toContain('Site own-new')
    expect(ownLabels[1]).toContain('Site own-old')

    const sharedLabels = wrapper.findAll('section')[1]!.findAll('li').map((li) => li.text())
    expect(sharedLabels[0]).toContain('Site shared-new')
    expect(sharedLabels[1]).toContain('Site shared-old')
  })

  it('only emits the selected dives on stage', async () => {
    const wrapper = mount(DivesoftDiveList, {
      props: {
        dives: [
          makeItem('a', false, '2024-01-01T00:00:00Z'),
          makeItem('b', false, '2024-02-01T00:00:00Z'),
        ],
      },
    })

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0]!.setValue(true)

    const stageButton = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Stage'))!
    await stageButton.trigger('click')

    const emitted = wrapper.emitted('stage')
    expect(emitted).toBeTruthy()
    const staged = emitted![0]![0] as DivesoftDiveJson[]
    expect(staged).toHaveLength(1)
  })

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mount(DivesoftDiveList, {
      props: { dives: [makeItem('a', false, '2024-01-01T00:00:00Z')] },
    })

    const cancelButton = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!
    await cancelButton.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('shows an empty-state message when there are no dives', () => {
    const wrapper = mount(DivesoftDiveList, { props: { dives: [] } })
    expect(wrapper.text()).toContain('No dives found in this wetnotes.com account.')
  })
})
