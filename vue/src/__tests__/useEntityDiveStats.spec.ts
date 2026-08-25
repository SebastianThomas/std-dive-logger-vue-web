import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useEntityDiveStats } from '@/composables/useEntityDiveStats'
import type { PagedResult, DiveWithoutProfiles, DiveSummary } from '@/lib/types/dive'

const getWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken }),
}))

function summaryStartingAt(start: number): DiveSummary {
  return { start, end: start, maxDepth: 0, averageDepth: 0, bottomTime: 'PT0S', surfaceIntervalBefore: 'PT0S' }
}

function diveWithId(id: number, start: number): Partial<DiveWithoutProfiles> {
  return { id, summary: summaryStartingAt(start) }
}

function page(result: Partial<DiveWithoutProfiles>[], totalElements: number) {
  return { data: { pageSize: 20, totalPages: 1, totalElements, result } as PagedResult<DiveWithoutProfiles> }
}

beforeEach(() => {
  getWithToken.mockReset()
})

describe('useEntityDiveStats', () => {
  it('does nothing while the url getter returns null (entity not loaded yet)', async () => {
    const stats = useEntityDiveStats(() => null)
    await nextTick()
    expect(getWithToken).not.toHaveBeenCalled()
    expect(stats.value.loading).toBe(true)
  })

  it('fetches ascending and descending pages in parallel and extracts first/last/count', async () => {
    getWithToken.mockImplementation((url: string) => {
      if (url.includes('ASCENDING')) return Promise.resolve(page([diveWithId(1, 100)], 5))
      return Promise.resolve(page([diveWithId(2, 900)], 5))
    })

    const stats = useEntityDiveStats(() => '/v1/dives/suit?suitId=1')
    await vi.waitUntil(() => !stats.value.loading)

    expect(stats.value.diveCount).toBe(5)
    expect(stats.value.firstDate).toBe(100)
    expect(stats.value.lastDate).toBe(900)
    expect(getWithToken).toHaveBeenCalledWith(
      '/v1/dives/suit?suitId=1&page=0&sortCol=DATE&sortDirection=ASCENDING',
    )
    expect(getWithToken).toHaveBeenCalledWith(
      '/v1/dives/suit?suitId=1&page=0&sortCol=DATE&sortDirection=DESCENDING',
    )
  })

  it('appends the page/sort params with & when the base url already has a query string', async () => {
    getWithToken.mockResolvedValue(page([], 0))
    useEntityDiveStats(() => '/v1/dives/computer?computerId=1')
    await nextTick()
    await nextTick()

    const calledUrls = getWithToken.mock.calls.map((c) => c[0] as string)
    expect(calledUrls.every((u) => u.includes('computerId=1&page=0'))).toBe(true)
  })

  it('re-fetches when the url getter starts returning a real url after being null', async () => {
    const id = ref<number | null>(null)
    getWithToken.mockResolvedValue(page([diveWithId(1, 42)], 1))

    const stats = useEntityDiveStats(() => (id.value ? `/v1/dives/suit?suitId=${id.value}` : null))
    await nextTick()
    expect(getWithToken).not.toHaveBeenCalled()

    id.value = 7
    await vi.waitUntil(() => !stats.value.loading)
    expect(stats.value.diveCount).toBe(1)
    expect(stats.value.firstDate).toBe(42)
  })

  it('leaves stats at their defaults (not throwing) when the request fails', async () => {
    getWithToken.mockRejectedValue(new Error('network error'))
    const stats = useEntityDiveStats(() => '/v1/dives/suit?suitId=1')
    await vi.waitUntil(() => !stats.value.loading)
    expect(stats.value.diveCount).toBe(0)
    expect(stats.value.firstDate).toBeNull()
  })
})
