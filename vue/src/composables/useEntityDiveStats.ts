import { ref, watch, type Ref } from 'vue'
import { useApi } from '@/composables/useApi'
import type { DiveWithoutProfiles, PagedResult } from '@/lib/types/dive'

export type EntityDiveStats = {
  diveCount: number
  firstDate: number | null
  lastDate: number | null
  loading: boolean
}

/**
 * First-used/last-used dates and a dive count for a gear detail page (suit/computer/CCR unit),
 * derived from the same "dives by X" list endpoint the filtered dive list already uses - a page
 * of 1 sorted ascending for the first dive, another sorted descending for the last, `totalElements`
 * for the count. No new backend aggregate needed for this.
 *
 * `baseUrl` is a getter (not a plain string) so it can depend on data that loads asynchronously
 * (the entity itself) - pass `() => entity.value ? \`/v1/dives/suit?suitId=${entity.value.id}\` : null`
 * and this re-fetches once the id becomes available.
 */
export function useEntityDiveStats(baseUrl: () => string | null): Ref<EntityDiveStats> {
  const { getWithToken } = useApi()
  const stats = ref<EntityDiveStats>({
    diveCount: 0,
    firstDate: null,
    lastDate: null,
    loading: true,
  })

  const load = async () => {
    const url = baseUrl()
    if (!url) return
    stats.value.loading = true
    const sep = url.includes('?') ? '&' : '?'
    try {
      const [firstRes, lastRes] = await Promise.all([
        getWithToken<PagedResult<DiveWithoutProfiles>>(
          `${url}${sep}page=0&sortCol=DATE&sortDirection=ASCENDING`,
        ),
        getWithToken<PagedResult<DiveWithoutProfiles>>(
          `${url}${sep}page=0&sortCol=DATE&sortDirection=DESCENDING`,
        ),
      ])
      stats.value = {
        diveCount: firstRes.data.totalElements,
        firstDate: firstRes.data.result[0]?.summary.start ?? null,
        lastDate: lastRes.data.result[0]?.summary.start ?? null,
        loading: false,
      }
    } catch {
      stats.value.loading = false
    }
  }

  watch(baseUrl, load, { immediate: true })

  return stats
}
