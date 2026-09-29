import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore, PENDING_LOGOUT_KEY } from '@/stores/auth'
import { useOfflineStore } from '@/stores/offline'
import { logoutOnServer, refreshAccessToken } from '@/lib/globals/auth/refreshToken'
import { writeEntry, writeOwner } from '@/lib/offline/offlineCache'
import { installFakeCaches } from './helpers/fakeCacheStorage'

vi.mock('@/lib/globals/auth/refreshToken', () => ({
  refreshAccessToken: vi.fn(),
  logoutOnServer: vi.fn(),
}))
const refresh = vi.mocked(refreshAccessToken)
const serverLogout = vi.mocked(logoutOnServer)

const cacheAccount = async () => {
  await writeOwner({ userId: 7, name: 'Sam', lastOnlineAt: Date.now() })
  await writeEntry('home', { userId: 7, savedAt: 1, data: { userName: 'Sam' } })
}

let fake: ReturnType<typeof installFakeCaches>

beforeEach(() => {
  vi.useFakeTimers()
  fake = installFakeCaches()
  setActivePinia(createPinia())
  refresh.mockReset()
  serverLogout.mockReset()
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('offline session', () => {
  it('keeps a cached account signed in when the server is unreachable at startup', async () => {
    await cacheAccount()
    refresh.mockResolvedValue({ kind: 'unreachable' })
    const auth = useAuthStore()

    await auth.tryInitialLogin()

    expect(auth.status).toBe('offline')
    expect(auth.hasSession).toBe(true)
    expect(auth.isInitialCheckDone).toBe(true)
    expect(useOfflineStore().home?.data).toEqual({ userName: 'Sam' })
    expect(fake.read('owner')).toBeDefined()
  })

  it('shows the app optimistically while still checking with a cached account', async () => {
    await cacheAccount()
    refresh.mockReturnValue(new Promise(() => {}))
    const auth = useAuthStore()

    void auth.tryInitialLogin()
    await vi.waitFor(() => expect(useOfflineStore().hydrated).toBe(true))

    expect(auth.status).toBe('checking')
    expect(auth.hasSession).toBe(true)
  })

  it('never claims "logged out" offline without a cached account', async () => {
    refresh.mockResolvedValue({ kind: 'unreachable' })
    const auth = useAuthStore()

    await auth.tryInitialLogin()

    expect(auth.status).toBe('offline')
    expect(auth.hasSession).toBe(false)
  })

  it('reconnects with backoff and bumps reconnectedAt when the server is back', async () => {
    await cacheAccount()
    refresh.mockResolvedValueOnce({ kind: 'unreachable' })
    const auth = useAuthStore()
    await auth.tryInitialLogin()

    refresh.mockResolvedValueOnce({ kind: 'ok', token: 'fresh' })
    await vi.advanceTimersByTimeAsync(15_000)

    expect(auth.status).toBe('authenticated')
    expect(auth.accessToken).toBe('fresh')
    expect(auth.reconnectedAt).toBeGreaterThan(0)
  })

  it('wipes the offline copy when the server rejects the session on reconnect', async () => {
    await cacheAccount()
    refresh.mockResolvedValueOnce({ kind: 'unreachable' })
    const auth = useAuthStore()
    await auth.tryInitialLogin()

    refresh.mockResolvedValueOnce({ kind: 'unauthorized' })
    await auth.retryNow()
    await vi.waitFor(() => expect(fake.read('owner')).toBeUndefined())

    expect(auth.status).toBe('anonymous')
    expect(auth.hasSession).toBe(false)
    expect(useOfflineStore().home).toBeNull()
  })

  it('an API outage mid-session switches to offline without dropping the token', async () => {
    const auth = useAuthStore()
    auth.login('live')

    auth.markUnreachable()

    expect(auth.status).toBe('offline')
    expect(auth.accessToken).toBe('live')
    expect(auth.hasSession).toBe(true)
  })

  it('finishes an offline logout before anything else on the next start', async () => {
    await cacheAccount()
    localStorage.setItem(PENDING_LOGOUT_KEY, '1')
    serverLogout.mockResolvedValue(true)
    const auth = useAuthStore()

    await auth.tryInitialLogin()

    expect(serverLogout).toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(auth.status).toBe('anonymous')
    expect(localStorage.getItem(PENDING_LOGOUT_KEY)).toBeNull()
  })

  it('keeps the pending logout when the server still cannot be reached', async () => {
    localStorage.setItem(PENDING_LOGOUT_KEY, '1')
    serverLogout.mockResolvedValue(false)
    const auth = useAuthStore()

    await auth.tryInitialLogin()

    expect(auth.status).toBe('anonymous')
    expect(localStorage.getItem(PENDING_LOGOUT_KEY)).toBe('1')
  })
})
