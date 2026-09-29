// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type PushEvent = { data: { json: () => unknown; text: () => string } | null; waitUntil: (p: Promise<unknown>) => void }

const SOURCE = readFileSync(new URL('../../public/sw-custom.js', import.meta.url), 'utf8')

let entries: Map<string, string>
let handlers: Map<string, (event: PushEvent) => void>
const showNotification = vi.fn(async () => {})
const unsubscribe = vi.fn(async () => true)
const postMessage = vi.fn()

beforeEach(() => {
  entries = new Map()
  handlers = new Map()
  showNotification.mockClear()
  unsubscribe.mockClear()
  postMessage.mockClear()
  const cache = {
    match: async (key: string) => (entries.has(key) ? new Response(entries.get(key)) : undefined),
    put: async (key: string, response: Response) => void entries.set(key, await response.text()),
  }
  runInNewContext(SOURCE, {
    Response,
    caches: { open: async () => cache, delete: async () => true },
    self: {
      addEventListener: (name: string, handler: (event: PushEvent) => void) => handlers.set(name, handler),
      registration: {
        showNotification,
        pushManager: { getSubscription: async () => ({ unsubscribe }) },
      },
      clients: { matchAll: async () => [{ postMessage }] },
    },
  })
})

const push = async (payload: unknown) => {
  let pending: Promise<unknown> | undefined
  handlers.get('push')!({
    data: { json: () => payload, text: () => JSON.stringify(payload) },
    waitUntil: (p) => {
      pending = p
    },
  })
  await pending
}

const sync = (over: Record<string, unknown> = {}) => ({
  type: 'LOGBOOK_SYNC',
  version: 1,
  userId: 7,
  generatedAt: 2_000,
  showNotification: false,
  title: 'Logbook synced',
  body: '214 dives · last: Blue Hole',
  url: '/',
  tag: 'dtl-sync',
  snapshot: { diveCount: 214, recentDives: [] },
  ...over,
})

const ownedBy = (userId: number) =>
  entries.set('/__offline/owner', JSON.stringify({ userId, name: 'Sam', lastOnlineAt: 1 }))

describe('logbook sync push', () => {
  it('stores the snapshot silently where the platform allows it', async () => {
    ownedBy(7)
    await push(sync())

    expect(JSON.parse(entries.get('/__offline/sync')!)).toEqual({
      userId: 7,
      savedAt: 2_000,
      data: { diveCount: 214, recentDives: [] },
    })
    expect(showNotification).not.toHaveBeenCalled()
    expect(postMessage).toHaveBeenCalledWith({ type: 'dtl-sync' })
  })

  it('shows one quiet, self-replacing notification where one is required (Apple)', async () => {
    ownedBy(7)
    await push(sync({ showNotification: true }))

    expect(showNotification).toHaveBeenCalledWith(
      'Logbook synced',
      expect.objectContaining({ silent: true, renotify: false, tag: 'dtl-sync' }),
    )
    expect(entries.has('/__offline/sync')).toBe(true)
  })

  it('never stores another account’s data and unsubscribes a logged-out device', async () => {
    ownedBy(8)
    await push(sync({ showNotification: true }))

    expect(entries.has('/__offline/sync')).toBe(false)
    expect(showNotification).not.toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('keeps a newer snapshot when an older push arrives late', async () => {
    ownedBy(7)
    await push(sync({ generatedAt: 5_000, snapshot: { diveCount: 215 } }))
    await push(sync({ generatedAt: 4_000, snapshot: { diveCount: 214 } }))

    expect(JSON.parse(entries.get('/__offline/sync')!).data.diveCount).toBe(215)
  })

  it('still shows reminders exactly as before', async () => {
    await push({ title: '3 years ago today', body: 'Blue Hole', url: '/dives/view/1', tag: 'DIVE_ANNIVERSARY' })

    expect(showNotification).toHaveBeenCalledWith(
      '3 years ago today',
      expect.objectContaining({ body: 'Blue Hole', tag: 'DIVE_ANNIVERSARY', data: { url: '/dives/view/1' } }),
    )
  })
})
