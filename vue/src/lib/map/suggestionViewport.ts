export type MapPoint = [number, number]
export function validCoordinate([lat, lon]: MapPoint): boolean {
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180
}

export function chooseSuggestionPoints(
  sites: { point: MapPoint; topPick: boolean }[],
  location: MapPoint | null,
  zoomFor: (points: MapPoint[]) => number,
  showAll = false,
): MapPoint[] {
  const validSites = sites.filter((s) => validCoordinate(s.point))
  const user = location && validCoordinate(location) ? location : null
  const all = [...validSites.map((s) => s.point), ...(user ? [user] : [])]
  if (!all.length || showAll || zoomFor(all) >= 7) return all
  const anchor = user ?? validSites.find((s) => s.topPick)?.point ?? all[0]!
  const distance = ([lat, lon]: MapPoint) => {
    const longitude = Math.min(Math.abs(lon - anchor[1]), 360 - Math.abs(lon - anchor[1]))
    return (lat - anchor[0]) ** 2 + (longitude * Math.cos((anchor[0] * Math.PI) / 180)) ** 2
  }
  const ranked = [...validSites].sort(
    (a, b) => Number(b.topPick) - Number(a.topPick) || distance(a.point) - distance(b.point),
  )
  const selected: MapPoint[] = [anchor]
  for (const site of ranked) {
    if (selected.some((p) => p[0] === site.point[0] && p[1] === site.point[1])) continue
    if (zoomFor([...selected, site.point]) >= 7) selected.push(site.point)
  }
  return selected
}
