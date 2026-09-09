import { expect, it } from 'vitest'
import { chooseSuggestionPoints, type MapPoint } from '@/lib/map/suggestionViewport'
const zoom = (points: MapPoint[]) =>
  Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0])) <= 2 ? 9 : 4
it('includes every nearby site and current location', () => {
  expect(
    chooseSuggestionPoints(
      [
        { point: [46, 8], topPick: true },
        { point: [47, 8], topPick: false },
      ],
      [46.5, 8],
      zoom,
    ),
  ).toHaveLength(3)
})
it('retains nearby top picks and location when distant sites require a world view', () => {
  const result = chooseSuggestionPoints(
    [
      { point: [46, 8], topPick: true },
      { point: [10, 8], topPick: true },
      { point: [47, 8], topPick: false },
    ],
    [46.5, 8],
    zoom,
  )
  expect(result).toContainEqual([46, 8])
  expect(result).toContainEqual([46.5, 8])
  expect(result).not.toContainEqual([10, 8])
})
it('allows an explicit overview of distant sites', () => {
  expect(
    chooseSuggestionPoints([{ point: [10, 8], topPick: true }], [46, 8], zoom, true),
  ).toHaveLength(2)
})
it('anchors on a top pick without geolocation and ignores invalid coordinates', () => {
  const result = chooseSuggestionPoints(
    [
      { point: [10, 8], topPick: false },
      { point: [46, 8], topPick: true },
      { point: [100, 8], topPick: true },
    ],
    null,
    zoom,
  )
  expect(result).toEqual([[46, 8]])
})
it('accepts zero coordinates and handles an empty result', () => {
  expect(chooseSuggestionPoints([], [0, 0], zoom)).toEqual([[0, 0]])
  expect(chooseSuggestionPoints([], null, zoom)).toEqual([])
})
