/** A plain external link URL for a coordinate - opens the device's own Google Maps app/tab, no
 * JS map interaction needed, so it works identically on mobile and desktop. */
export function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}
