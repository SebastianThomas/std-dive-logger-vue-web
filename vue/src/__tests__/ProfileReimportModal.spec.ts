import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileReimportModal from '@/components/dive/view/ProfileReimportModal.vue'
import type { DiveProfile } from '@/lib/types/dive'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ postWithToken: post }) }))
const clockOffset = { existingStart: Date.parse('2026-07-01T10:00:00Z'), reimportedStart: Date.parse('2026-07-01T12:00:00Z'), offsetMinutes: 120 }
const profile = { id: 1, start: clockOffset.existingStart, diveComputer: { customIdentifier: 'Shearwater' } } as DiveProfile
async function upload() {
  const wrapper = mount(ProfileReimportModal, { props: { profiles: [profile], diveId: 1, isOpen: true, zoneId: 'Europe/Zurich' } })
  const input = wrapper.get('input[type=file]')
  Object.defineProperty(input.element, 'files', { value: [new File(['xml'], 'dive.xml')] })
  await input.trigger('change')
  await wrapper.get('button.btn-action').trigger('click')
  await flushPromises()
  return wrapper
}
beforeEach(() => post.mockReset())
describe('profile time resolution', () => {
  it('requires an explicit choice and shows both times in the site zone', async () => {
    post.mockResolvedValueOnce({ data: { pendingImportId: 7, conflicts: { clockOffset } } })
    const w = await upload()
    expect(w.text()).toContain('12:00')
    expect(w.text()).toContain('14:00')
    expect(post).toHaveBeenCalledTimes(1)
    expect(w.get('button.btn-action').attributes('disabled')).toBeDefined()
    await w.get('input[value=NEW]').setValue()
    post.mockResolvedValueOnce({ data: {} })
    await w.get('button.btn-action').trigger('click')
    await flushPromises()
    expect(post.mock.calls[1]![1]).toMatchObject({ startClock: 'NEW' })
    w.unmount()
  })
  it('returns to the picker on a structured 400 clock conflict', async () => {
    post.mockResolvedValueOnce({ data: { pendingImportId: 7, conflicts: {} } })
    post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'REIMPORT_CLOCK_CONFLICT', detail: 'Choose a time', clockOffset } } })
    const w = await upload()
    expect(w.findAll('input[type=radio]')).toHaveLength(2)
    expect(w.text()).toContain('Choose a time')
    w.unmount()
  })
  it('shows the backend reason for an unrelated profile without offering an override', async () => {
    post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { detail: 'Depth profile does not match' } } })
    const w = await upload()
    expect(w.text()).toContain('Depth profile does not match')
    expect(w.findAll('input[type=radio]')).toHaveLength(0)
    w.unmount()
  })
})
