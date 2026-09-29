import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { OfflineError } from '@/lib/offline/offlineError'
import { useAuthStore } from '@/stores/auth'
import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { toast } from 'vue-sonner'

/** No response at all (network error / timeout) or a gateway-level error. */
function isUnreachable(err: unknown): boolean {
  if (axios.isCancel(err) || !axios.isAxiosError(err)) return false
  const status = err.response?.status
  return !err.response || status === 502 || status === 503 || status === 504
}

/**
 * Converts "server unreachable" into the app's offline mode while a session exists (a banner, not
 * a toast per request - see OfflineBanner.vue); without one it's the old toast. Returns the error
 * to throw, or null when the error isn't an outage.
 */
function handleServerUnreachable(
  err: unknown,
  authStore: ReturnType<typeof useAuthStore>,
): Error | null {
  if (!isUnreachable(err)) return null
  if (authStore.hasSession) {
    authStore.markUnreachable()
    return new OfflineError()
  }
  toast.error('The server is not reachable. Please try again later.')
  return err as Error
}

export type BodyType = object | string | number

export function useApi() {
  const authStore = useAuthStore()

  const withToken = (init?: AxiosRequestConfig, token?: string): AxiosRequestConfig => {
    const headers: Record<string, string> = {}
    const baseInit = init ?? {}

    if (authStore.isLoggedIn && authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return {
      ...baseInit,
      headers: {
        ...baseInit.headers,
        ...headers,
      },
    }
  }

  const getTokenOrRefresh = async ({ force }: { force: boolean }): Promise<string> => {
    if (!force && !authStore.isRefreshing && authStore.accessToken) {
      return authStore.accessToken
    }
    const token = await authStore.refreshToken()
    if (token) return token
    if (authStore.isOffline) throw new OfflineError()
    throw new Error('Could not refresh, please log in again.')
  }

  /**
   * requestWithRetry rewritten for axios
   */
  const requestWithRetry = async function <T = unknown, D = unknown, H = object>(
    resolvedUrl: string,
    method: string,
    init: AxiosRequestConfig | undefined,
    body?: D,
  ): Promise<AxiosResponse<T, D, H>> {
    const session = authStore.sessionVersion
    const ensureCurrentRequest = () => {
      if (init?.signal?.aborted || authStore.sessionVersion !== session) {
        throw new axios.CanceledError('Request canceled or login session changed')
      }
    }
    ensureCurrentRequest()
    const token = await getTokenOrRefresh({ force: false })
    ensureCurrentRequest()
    if (!token) {
      throw new Error('Refreshing failed or another refresh request is outstanding.')
    }

    const firstConfig: AxiosRequestConfig = {
      ...withToken(init, token),
      method,
      url: resolvedUrl,
      data: body,
    }

    try {
      const response = await axios<T, AxiosResponse<T, D, H>, D>(firstConfig)
      ensureCurrentRequest()
      return response
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) {
        throw err
      }
      const outage = handleServerUnreachable(err, authStore)
      if (outage) throw outage
      const status = err.response?.status
      if (!status || status !== 401) {
        throw err
      }

      ensureCurrentRequest()

      // Try refresh
      const newToken =
        authStore.accessToken && authStore.accessToken !== token
          ? authStore.accessToken
          : await getTokenOrRefresh({ force: true })
      ensureCurrentRequest()
      if (!newToken) throw new Error('Unauthorized: refresh failed')

      const retryConfig: AxiosRequestConfig = {
        ...withToken(init, newToken),
        method,
        url: resolvedUrl,
        data: body,
      }

      try {
        const response = await axios<T, AxiosResponse<T, D, H>, D>(retryConfig)
        ensureCurrentRequest()
        return response
      } catch (err: unknown) {
        if (!(err instanceof AxiosError)) {
          throw err
        }
        const retryOutage = handleServerUnreachable(err, authStore)
        if (retryOutage) throw retryOutage
        if (err.response?.status === 401) {
          throw new Error('Unauthorized')
        }
        throw err
      }
    }
  }

  const getWithToken = async <T = unknown, H = unknown>(url: string, init?: AxiosRequestConfig) => {
    const resolved = resolveUrl(url)
    return await requestWithRetry<T, undefined, H>(resolved, 'GET', init)
  }

  const deleteWithToken = async <T = unknown, D = object, H = unknown>(
    url: string,
    body?: D,
    init?: AxiosRequestConfig,
  ) => {
    const resolved = resolveUrl(url)
    return await requestWithRetry<T, D, H>(resolved, 'DELETE', init, body)
  }

  const postWithToken = async <T = unknown, D = object, H = unknown>(
    url: string,
    body?: D,
    init?: AxiosRequestConfig,
    contentType: string | null = 'application/json',
  ) => {
    const resolved = resolveUrl(url)
    const contentTypeHeader = contentType === null ? {} : { 'Content-Type': contentType }

    const headers = {
      ...contentTypeHeader,
      ...init?.headers,
    } as AxiosHeaders

    const initWithJson: AxiosRequestConfig = { ...init, headers }

    return await requestWithRetry<T, D | string, H>(resolved, 'POST', initWithJson, body)
  }

  const putWithToken = async <T = unknown, D = object, H = unknown>(
    url: string,
    body?: D,
    init?: AxiosRequestConfig,
  ) => {
    const resolved = resolveUrl(url)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const initWithJson: AxiosRequestConfig = {
      ...init,
      headers: { ...init?.headers, ...headers },
    }

    return await requestWithRetry<T, D, H>(resolved, 'PUT', initWithJson, body)
  }

  return { getWithToken, postWithToken, putWithToken, refresh: getTokenOrRefresh, deleteWithToken }
}
