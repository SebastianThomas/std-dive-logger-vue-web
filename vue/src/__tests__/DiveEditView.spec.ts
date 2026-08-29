import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import DiveEditView from '@/views/DiveEditView.vue'
import type { Dive, DiveBackfillStatus } from '@/lib/types/dive'

const getWithToken = vi.fn()
const putWithToken = vi.fn()
const postWithToken = vi.fn()

vi.mock('@/composables/useApi', () => ({ useApi: () => ({ getWithToken, putWithToken, postWithToken }) }))
vi.mock('@/composables/useNavigation', () => ({ useNavigation: () => ({ safeBack: vi.fn() }) }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const completeDive = (): Dive =>
  ({
    id: 123,
    user: { id: 1, name: 'Me' },
    number: 7,
    notes: 'A full write-up of the dive.',
    customIdentifier: 'House reef',
    visibility: { meters: 20, feeling: 'HIGH' },
    gasConsumption: { sacBar: 0.6, rmvLiters: 15, totalLiters: 1800 },
    cylinderConsumption: { ocRmvLiters: 15 },
    gasConsumptionComparison: {
      insertedRmvLiters: 15,
      insertedTotalLiters: 1800,
      impliedRmvFromTotalLiters: 15,
      calculatedRmvLiters: 15,
      calculatedTotalLiters: 1800,
      mismatch: false,
    },
    configuration: { suit: { id: 0, userId: 1, type: null, notes: '' }, weight: 6, cylinders: [] },
    site: { id: 5, name: 'Reef', latitude: 0, longitude: 0 },
    profiles: [],
    buddiesDives: [],
    namedBuddies: [],
    summary: { start: 0, end: 2_400_000, maxDepth: 30, averageDepth: 18, bottomTime: 'PT40M', surfaceIntervalBefore: 'PT1H' },
    tags: [],
    leader: { type: 'SELF' },
    teamTerminology: 'BUDDY',
  }) as unknown as Dive

const status = (over: Partial<DiveBackfillStatus>): DiveBackfillStatus => ({
  diveId: 123,
  number: 7,
  diveIdentifier: 'House reef',
  siteId: 5,
  siteName: 'Reef',
  missingFields: [],
  dismissedFields: [],
  ...over,
})

const mountView = async (dive: Dive, backfill: DiveBackfillStatus) => {
  getWithToken.mockImplementation((url: string) => {
    if (url === '/v1/users/') return Promise.resolve({ data: { id: 1 } })
    if (url.endsWith('/backfill')) return Promise.resolve({ data: backfill })
    return Promise.resolve({ data: null })
  })
  postWithToken.mockResolvedValue({ data: dive })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div/>' } },
      { path: '/dives/view/:diveId', name: 'DiveView', component: { template: '<div/>' } },
      { path: '/dives/edit/:diveId', name: 'DiveEdit', component: { template: '<div/>' } },
    ],
  })
  router.push('/dives/edit/123')
  await router.isReady()

  const wrapper = mount(DiveEditView, {
    global: {
      plugins: [router],
      stubs: { EditDiveForm: true, BackfillBanner: true, TagSelector: true, TagBadge: true },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  getWithToken.mockReset()
  putWithToken.mockReset()
  postWithToken.mockReset()
})

describe('DiveEditView - "Save & dismiss (no more info)"', () => {
  it('is absent (not merely disabled) when nothing is outstanding', async () => {
    const wrapper = await mountView(completeDive(), status({ missingFields: [] }))
    const dismissBtn = wrapper.findAll('button').find((b) => b.text().includes('Save & dismiss'))
    expect(dismissBtn).toBeUndefined()
    // The plain "Save Changes" button is still there.
    expect(wrapper.findAll('button').some((b) => b.text().includes('Save Changes'))).toBe(true)
  })

  it('appears when the live form still has an outstanding gap', async () => {
    const dive = completeDive()
    dive.notes = ''
    const wrapper = await mountView(dive, status({ missingFields: ['NOTES'] }))
    const dismissBtn = wrapper.findAll('button').find((b) => b.text().includes('Save & dismiss'))
    expect(dismissBtn).toBeTruthy()
  })
})
