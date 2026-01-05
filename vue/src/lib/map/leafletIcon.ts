import { Icon } from 'leaflet'

export const defaultIcon = new Icon({
  iconUrl: '/leaflet/marker-icon-diver-80-120.png',
  iconRetinaUrl: '/leaflet/marker-icon-diver-80-120.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [40, 55],
  shadowSize: [50, 55],
  iconAnchor: [20, 55],
  shadowAnchor: [15, 55],
  popupAnchor: [0, -55],
})

// Configure default icon globally for compatibility
if (typeof window !== 'undefined') {
  // @ts-expect-error to render own icons
  delete Icon.Default.prototype._getIconUrl

  Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon-diver-80-120.png',
    iconRetinaUrl: '/leaflet/marker-icon-diver-80-120.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [40, 55],
    shadowSize: [50, 55],
    iconAnchor: [20, 55],
    shadowAnchor: [15, 55],
    popupAnchor: [0, -55],
  })
}
