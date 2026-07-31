import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios, { type AxiosRequestConfig } from 'axios'
import { useApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import { refreshAccessToken } from '@/lib/globals/auth/refreshToken'

// Replace the real refresh call with a controllable mock so we can assert
// exactly how many times it's invoked and simulate real-world latency.
vi.mock('@/lib/globals/auth/refreshToken', () => ({
  refreshAccessToken: vi.fn(),
}))

// Replace the axios request function itself, while keeping the real
// AxiosError/isAxiosError/AxiosHeaders etc. so useApi's error-handling code
// (which relies on `axios.isAxiosError` and `instanceof AxiosError`) keeps
// working unmodified.
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  const mockRequest = vi.fn()
  const mockedDefault = Object.assign(mockRequest, actual.default)
  return { ...actual, default: mockedDefault }
})

const mockedAxios = vi.mocked(axios)
const mockedRefresh = vi.mocked(refreshAccessToken)

function makeUnauthorizedError() {
  return Object.assign(new Error('Unauthorized'), {
    isAxiosError: true,
    response: { status: 401 },
  })
}

describe('useApi 401 refresh race', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedAxios.mockReset()
    mockedRefresh.mockReset()
  })

  it('only refreshes once when two concurrent requests both hit a 401, and both get the fresh token', async () => {
    const authStore = useAuthStore()
    authStore.login('stale-token')

    // Simulate a real network round-trip so the two concurrent requests
    // genuinely race the same in-flight refresh instead of resolving
    // synchronously.
    mockedRefresh.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return 'fresh-token'
    })

    // useApi.ts always calls axios(config) with a single config object (never the axios(url,
    // config) two-arg form) - typed to match vi.mocked's overload-collapsed signature, then cast
    // back to the shape actually passed at runtime.
    mockedAxios.mockImplementation(async (configArg: string | AxiosRequestConfig) => {
      const config = configArg as AxiosRequestConfig
      const authHeader = (config?.headers as Record<string, string> | undefined)?.Authorization
      if (authHeader === 'Bearer fresh-token') {
        return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config }
      }
      throw makeUnauthorizedError()
    })

    const { getWithToken } = useApi()

    const [res1, res2] = await Promise.all([
      getWithToken('/api/dives'),
      getWithToken('/api/dives'),
    ])

    expect(res1.data).toBe('ok')
    expect(res2.data).toBe('ok')

    // The crux of the bug fix: a single-use/rotated refresh token can only
    // be redeemed once. If both callers triggered their own refresh, the
    // second would fail and log the user out.
    expect(mockedRefresh).toHaveBeenCalledTimes(1)

    expect(authStore.isLoggedIn).toBe(true)
    expect(authStore.accessToken).toBe('fresh-token')
  })

  it('logs out and rejects both callers when the shared refresh fails', async () => {
    const authStore = useAuthStore()
    authStore.login('stale-token')

    mockedRefresh.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return null
    })

    mockedAxios.mockImplementation(async () => {
      throw makeUnauthorizedError()
    })

    const { getWithToken } = useApi()

    const results = await Promise.allSettled([
      getWithToken('/api/dives'),
      getWithToken('/api/dives'),
    ])

    expect(results[0].status).toBe('rejected')
    expect(results[1].status).toBe('rejected')
    expect(mockedRefresh).toHaveBeenCalledTimes(1)
    expect(authStore.isLoggedIn).toBe(false)
  })
})
