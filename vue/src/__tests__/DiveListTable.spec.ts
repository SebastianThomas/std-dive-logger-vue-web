import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DiveListTable from '@/components/DiveListTable.vue'
import type { DiveWithoutProfiles } from '@/lib/types/dive'

const dive: DiveWithoutProfiles = {
  id: 42,
  user: { id: 1, name: 'Sebastian' },
  number: 7,
  customIdentifier: '',
  previewImage: '',
  site: { name: 'Wreck', latitude: 0, longitude: 0 },
  buddiesDives: [],
  namedBuddies: [],
  summary: { start: 0, end: 0, maxDepth: 30, averageDepth: 20, bottomTime: 'PT30M', surfaceIntervalBefore: 'PT0M' },
  tags: [],
  highlighted: false,
  manualEntry: false,
}

async function mountTable(extraProps: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div/>' } },
      { path: '/dives/view/:diveId', name: 'DiveView', component: { template: '<div/>' } },
    ],
  })
  router.push('/')
  await router.isReady()

  return mount(DiveListTable, {
    global: {
      plugins: [router],
      stubs: { DiveSitePreview: true, StyledCheckbox: true, TagBadge: true },
    },
    props: {
      dives: [dive],
      selectedIds: [],
      myUserId: 1,
      isLoading: false,
      status: '',
      searchQuery: '',
      sortColumn: 'NUMBER',
      sortDirection: 'DESCENDING',
      columns: [],
      ...extraProps,
    },
  })
}

describe('DiveListTable row navigation', () => {
  it('emits row-click on a plain click, not just a link within one cell', async () => {
    const wrapper = await mountTable()
    // Regression guard: the row content is plain text, not an <a>, so styling stays consistent
    // with the rest of the app and every part of the row is equally clickable.
    expect(wrapper.find('a').exists()).toBe(false)

    await wrapper.get('tbody tr').trigger('click')
    expect(wrapper.emitted('row-click')).toEqual([[42]])
  })

  it('opens the dive in a new tab on ctrl+click instead of emitting row-click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = await mountTable()

    await wrapper.get('tbody tr').trigger('click', { ctrlKey: true })

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/dives/view/42'), '_blank')
    expect(wrapper.emitted('row-click')).toBeUndefined()

    openSpy.mockRestore()
  })

  it('opens the dive in a new tab on cmd/meta+click and shift+click too', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = await mountTable()

    await wrapper.get('tbody tr').trigger('click', { metaKey: true })
    await wrapper.get('tbody tr').trigger('click', { shiftKey: true })

    expect(openSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('row-click')).toBeUndefined()

    openSpy.mockRestore()
  })

  it('still lets the checkbox cell stop propagation instead of navigating', async () => {
    const wrapper = await mountTable()
    await wrapper.get('tbody td').trigger('click')
    expect(wrapper.emitted('row-click')).toBeUndefined()
  })

  it('highlights the row matching focusedId (j/k keyboard navigation)', async () => {
    const wrapper = await mountTable({ focusedId: 42 })
    expect(wrapper.get('tbody tr').classes()).toContain('ring-2')
  })

  it('does not highlight any row when focusedId is null', async () => {
    const wrapper = await mountTable({ focusedId: null })
    expect(wrapper.get('tbody tr').classes()).not.toContain('ring-2')
  })

  it('emits toggle-highlight (and not row-click) when the star is clicked', async () => {
    const wrapper = await mountTable()
    const star = wrapper.get('button[title="Highlight this dive"]')
    await star.trigger('click')
    expect(wrapper.emitted('toggle-highlight')).toEqual([[42]])
    expect(wrapper.emitted('row-click')).toBeUndefined()
  })

  it('shows a filled star for an already-highlighted dive', async () => {
    const wrapper = await mountTable({ dives: [{ ...dive, highlighted: true }] })
    expect(wrapper.get('button[title="Remove highlight"]').find('i').classes()).toContain(
      'fa-solid',
    )
  })
})
