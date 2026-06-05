import { refreshAccessToken } from '@/lib/globals/auth/refreshToken'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { useAuthStore } from '@/stores/auth'
import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { toast } from 'vue-sonner'

/** Returns true and shows a toast when the error indicates the server is unreachable. */
function handleServerUnreachable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  // No response at all (network error / ECONNREFUSED) or gateway-level errors
  if (!err.response || status === 502 || status === 503 || status === 504) {
    toast.error('The server is not reachable. Please try again later.')
    return true
  }
  return false
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
    while (authStore.isRefreshing) {
      // wait
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (!force && authStore.isLoggedIn && authStore.accessToken) {
      return authStore.accessToken
    }
    authStore.setRefreshing()
    const token = await refreshAccessToken()
    if (token) {
      authStore.login(token)
      return token
    }
    authStore.logout()
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
    const token = await getTokenOrRefresh({ force: false })
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
      return await axios(firstConfig)
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) {
        throw err
      }
      if (handleServerUnreachable(err)) throw err
      const status = err.response?.status
      if (!status || status !== 401) {
        throw err
      }

      // Try refresh
      const newToken = await getTokenOrRefresh({ force: true })
      if (!newToken) throw new Error('Unauthorized: refresh failed')

      const retryConfig: AxiosRequestConfig = {
        ...withToken(init, newToken),
        method,
        url: resolvedUrl,
        data: body,
      }

      try {
        return await axios(retryConfig)
      } catch (err: unknown) {
        if (!(err instanceof AxiosError)) {
          throw err
        }
        if (handleServerUnreachable(err)) throw err
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

export default useApi
