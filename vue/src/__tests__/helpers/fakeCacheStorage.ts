import { vi } from 'vitest'

/** In-memory CacheStorage (jsdom has none) - enough for lib/offline/offlineCache.ts. */
export function installFakeCaches() {
  const stores = new Map<string, Map<string, string>>()
  const storage = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map())
      const entries = stores.get(name)!
      return {
        async match(key: RequestInfo | URL) {
          const body = entries.get(String(key))
          return body === undefined ? undefined : new Response(body)
        },
        async put(key: RequestInfo | URL, response: Response) {
          entries.set(String(key), await response.text())
        },
      }
    },
    async delete(name: string) {
      return stores.delete(name)
    },
    async keys() {
      return [...stores.keys()]
    },
  }
  vi.stubGlobal('caches', storage)
  const read = (key: string) => {
    const body = stores.get('dtl-offline-v1')?.get(`/__offline/${key}`)
    return body === undefined ? undefined : JSON.parse(body)
  }
  return { stores, read }
}
