import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import PendingImportRow from '@/components/dive/import/PendingImportRow.vue'
import type { DiveWithoutProfiles, PendingImportSummary } from '@/lib/types/dive'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken: get, postWithToken: post, deleteWithToken: vi.fn() }),
}))
vi.mock('@/composables/useReadOnlyMode', () => ({
  useReadOnlyMode: () => ({ readOnly: ref(false) }),
}))

const summary: PendingImportSummary = {
  id: 5,
  source: 'XML_SHEARWATER',
  filename: 'dive.xml',
  diveIdentifierGuess: 'Guessed name',
  siteNameGuess: 'Lake',
  startDate: Date.parse('2026-08-22T10:00:00Z'),
  createdAt: 0,
}
const target = {
  id: 42,
  number: 134,
  customIdentifier: 'Existing dive',
  summary: { start: Date.parse('2026-08-22T10:00:00Z') },
} as unknown as DiveWithoutProfiles

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  get.mockImplementation((url: string) =>
    Promise.resolve({ data: url === '/v1/dives/42' ? target : { result: [] } }),
  )
})

const nameInput = (w: ReturnType<typeof mount>) => w.find('input#pending-5-name')

describe('PendingImportRow', () => {
  it('asks for a dive name when the file becomes a new dive', async () => {
    const w = mount(PendingImportRow, { props: { summary }, global: { stubs: ['DiveGraph'] } })
    await flushPromises()
    expect(nameInput(w).exists()).toBe(true)
    expect((nameInput(w).element as HTMLInputElement).value).toBe('Guessed name')
    w.unmount()
  })

  it('has no dive name field when adding a profile to an existing dive', async () => {
    const w = mount(PendingImportRow, {
      props: { summary, attachToDiveId: 42 },
      global: { stubs: ['DiveGraph'] },
    })
    await flushPromises()
    expect(nameInput(w).exists()).toBe(false)
    expect(w.text()).toContain('another profile of dive #134')

    post.mockResolvedValueOnce({ data: target })
    const commit = w.findAll('button').find((b) => b.text() === 'Commit')!
    await commit.trigger('click')
    await flushPromises()
    expect(post.mock.calls[0]![1]).toEqual({ linkToExistingDiveId: 42, profileTrims: undefined })
    w.unmount()
  })
})
