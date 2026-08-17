import { describe, it, expect } from 'vitest'
import { toggleMetricSelection } from '@/lib/stats/timelineMetricSelection'
import type { TimelineMetric } from '@/lib/types/statsTimeline'

const set = (...metrics: TimelineMetric[]) => new Set(metrics)

describe('toggleMetricSelection', () => {
  it('plain click selects only that metric, replacing any prior selection', () => {
    const result = toggleMetricSelection(set('diveCount', 'maxDepth'), 'avgTemperature', false)
    expect(result).toEqual(set('avgTemperature'))
  })

  it('plain click on the sole selected metric clears the selection', () => {
    const result = toggleMetricSelection(set('maxDepth'), 'maxDepth', false)
    expect(result).toEqual(set())
  })

  it('combine adds a same-unit metric to an existing single-metric selection', () => {
    const result = toggleMetricSelection(set('maxDepth'), 'avgDepth', true)
    expect(result).toEqual(set('maxDepth', 'avgDepth'))
  })

  it('combine adds a metric compatible with ANY existing member, not just the first-inserted one - this is the actual bug fix: the default selection mixes diveCount (unit-less) and maxDepth (metres), and combining a third metre-based metric must not fail just because it does not match diveCount specifically', () => {
    const result = toggleMetricSelection(set('diveCount', 'maxDepth'), 'avgDepth', true)
    expect(result).toEqual(set('diveCount', 'maxDepth', 'avgDepth'))
  })

  it('combine on an incompatible-unit metric resets to a single selection of just that metric', () => {
    const result = toggleMetricSelection(set('maxDepth'), 'avgTemperature', true)
    expect(result).toEqual(set('avgTemperature'))
  })

  it('combine on an already-selected metric removes it', () => {
    const result = toggleMetricSelection(set('maxDepth', 'avgDepth'), 'avgDepth', true)
    expect(result).toEqual(set('maxDepth'))
  })

  it('combine from an empty selection just selects that metric', () => {
    const result = toggleMetricSelection(set(), 'avgRmv', true)
    expect(result).toEqual(set('avgRmv'))
  })

  it('does not mutate the input set', () => {
    const original = set('maxDepth')
    toggleMetricSelection(original, 'avgDepth', true)
    expect(original).toEqual(set('maxDepth'))
  })
})
