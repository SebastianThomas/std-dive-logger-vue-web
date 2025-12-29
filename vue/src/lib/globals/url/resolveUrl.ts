import { AUTOCOMPLETE_URL, BASE_URL } from '../constants'

// Resolve a possibly-relative API path against `BASE_URL` while avoiding
// duplicate slashes (and preserving the protocol part like `https://`).
export function resolveUrl(path: string, baseUrl: string = BASE_URL || ''): string {
  if (!path) return path
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path

  if (!baseUrl) {
    console.warn('Base URL is empty')
  }
  while (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  let joined: string
  if (baseUrl === '') {
    joined = path
  } else {
    joined = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
  }

  const protocolIdx = joined.indexOf('://')
  if (protocolIdx >= 0) {
    const proto = joined.slice(0, protocolIdx + 3)
    const rest = joined.slice(protocolIdx + 3).replaceAll('//', '/')
    return proto + rest
  }

  return joined.replaceAll('//', '/')
}

export function resolveAutocompleteUrl(path: string): string {
  return resolveUrl(path, AUTOCOMPLETE_URL)
}
