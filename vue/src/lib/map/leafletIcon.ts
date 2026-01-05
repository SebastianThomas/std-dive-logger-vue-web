import { Icon } from 'leaflet'

export const defaultIcon = new Icon({
  iconUrl: '/leaflet/marker-icon-diver-80-120.png',
  iconRetinaUrl: '/leaflet/marker-icon-diver-80-120.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [30, 40],
  shadowSize: [35, 40],
  iconAnchor: [15, 40],
  shadowAnchor: [12, 40],
  popupAnchor: [0, -40],
})

// Configure default icon globally for compatibility
if (typeof window !== 'undefined') {
  // @ts-expect-error to render own icons
  delete Icon.Default.prototype._getIconUrl

  Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon-diver-80-120.png',
    iconRetinaUrl: '/leaflet/marker-icon-diver-80-120.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [30, 40],
    shadowSize: [35, 40],
    iconAnchor: [15, 40],
    shadowAnchor: [12, 40],
    popupAnchor: [0, -40],
  })
}
