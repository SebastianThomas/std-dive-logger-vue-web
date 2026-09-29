import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { refreshAccessToken, type RefreshOutcome } from '@/lib/globals/auth/refreshToken'
import { useApi } from '@/composables/useApi'

vi.mock('@/lib/globals/auth/refreshToken', () => ({ refreshAccessToken: vi.fn() }))
const refresh = vi.mocked(refreshAccessToken)

beforeEach(() => {
  setActivePinia(createPinia())
  refresh.mockReset()
})

it('shares startup refresh with API callers', async () => {
  const auth = useAuthStore()
  refresh.mockResolvedValue({ kind: 'ok', token: 'token' })
  const initial = auth.tryInitialLogin()
  const token = useApi().refresh({ force: true })
  await initial
  await expect(token).resolves.toBe('token')
  expect(refresh).toHaveBeenCalledTimes(1)
  expect(auth.isInitialCheckDone).toBe(true)
})

it.each(['logout', 'switch account'] as const)('ignores a refresh completed after %s', async action => {
  const auth = useAuthStore()
  auth.login('old-token')
  let finish!: (outcome: RefreshOutcome) => void
  refresh.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const pending = auth.refreshToken()
  await Promise.resolve()
  if (action === 'logout') auth.logout()
  else auth.login('different-account')
  finish({ kind: 'ok', token: 'late-token' })
  await expect(pending).resolves.toBeNull()
  expect(auth.accessToken).toBe(action === 'logout' ? null : 'different-account')
  expect(auth.isRefreshing).toBe(false)
})

it('releases the refresh lock after an unexpected failure', async () => {
  const auth = useAuthStore()
  refresh
    .mockRejectedValueOnce(new Error('failure'))
    .mockResolvedValueOnce({ kind: 'ok', token: 'next' })
  await expect(auth.refreshToken()).rejects.toThrow('failure')
  expect(auth.isRefreshing).toBe(false)
  await expect(auth.refreshToken()).resolves.toBe('next')
})
