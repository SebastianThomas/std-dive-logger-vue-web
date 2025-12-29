import L from 'leaflet'
export { default } from 'leaflet'

if (typeof window !== 'undefined') {
  // @ts-expect-error to render own icons
  delete L.Icon.Default.prototype._getIconUrl

  L.Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon-taucher.png',
    iconRetinaUrl: '/leaflet/marker-icon-taucher.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  })
}
