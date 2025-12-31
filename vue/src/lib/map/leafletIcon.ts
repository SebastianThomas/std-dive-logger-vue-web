import { Icon } from 'leaflet'

export const defaultIcon = new Icon({
  iconUrl: '/leaflet/marker-icon-taucher.png',
  iconRetinaUrl: '/leaflet/marker-icon-taucher.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -50],
})

// Configure default icon globally for compatibility
if (typeof window !== 'undefined') {
  // @ts-expect-error to render own icons
  delete Icon.Default.prototype._getIconUrl

  Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon-taucher.png',
    iconRetinaUrl: '/leaflet/marker-icon-taucher.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  })
}
