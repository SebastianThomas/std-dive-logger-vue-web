// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

it('removes legacy private and opaque caches but keeps current tiles and the app shell', async () => {
  const entries = new Set(['dtl-api', 'dtl-map-tiles', 'dtl-map-tiles-v2', 'workbox-precache'])
  const handlers = new Map<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void>()
  runInNewContext(readFileSync(new URL('../../public/sw-custom.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (name: string, handler: typeof handlers extends Map<string, infer H> ? H : never) => handlers.set(name, handler) },
    caches: { delete: async (name: string) => entries.delete(name) },
  })
  for (let i = 0; i < 2; i++) {
    let pending: Promise<unknown> | undefined
    handlers.get('activate')!({ waitUntil: promise => { pending = promise } })
    await pending
    expect([...entries]).toEqual(['dtl-map-tiles-v2', 'workbox-precache'])
  }
})
