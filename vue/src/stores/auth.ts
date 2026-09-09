import { refreshAccessToken } from '@/lib/globals/auth/refreshToken'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type LoggedInState = {
  loggedIn: true
  accessToken: string
  refreshing: boolean
}

export type LoggedOutState = {
  loggedIn: false
  refreshing: boolean
}

export type AuthState = LoggedInState | LoggedOutState

export const useAuthStore = defineStore('auth', () => {
  const authState = ref<AuthState>({
    loggedIn: false,
    refreshing: false,
  })
  const initialCheckDone = ref(false)

  let refreshPromise: Promise<string | null> | null = null
  const sessionVersion = ref(0)

  const isLoggedIn = computed(() => authState.value.loggedIn)
  const accessToken = computed(() =>
    authState.value.loggedIn ? authState.value.accessToken : null,
  )
  const isRefreshing = computed(() => authState.value.refreshing)
  const isInitialCheckDone = computed(() => initialCheckDone.value)

  function login(token: string) {
    sessionVersion.value++
    refreshPromise = null
    authState.value = {
      loggedIn: true,
      accessToken: token,
      refreshing: false,
    }
    initialCheckDone.value = true
  }

  function logout() {
    sessionVersion.value++
    refreshPromise = null
    authState.value = {
      loggedIn: false,
      refreshing: false,
    }
    initialCheckDone.value = true
  }

  function refreshToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise
    const version = sessionVersion.value
    authState.value = { ...authState.value, refreshing: true }
    const pending = Promise.resolve().then(async () => {
      try {
        const token = await refreshAccessToken()
        if (version !== sessionVersion.value) return null
        if (token) {
          authState.value = { loggedIn: true, accessToken: token, refreshing: false }
        } else {
          logout()
        }
        return token
      } finally {
        if (version === sessionVersion.value) {
          authState.value = { ...authState.value, refreshing: false }
          initialCheckDone.value = true
        }
        if (refreshPromise === pending) refreshPromise = null
      }
    })
    refreshPromise = pending
    return pending
  }

  function waitForInitialCheck(): Promise<void> {
    if (initialCheckDone.value) return Promise.resolve()
    return new Promise((resolve) => {
      const stop = watch(initialCheckDone, (done) => {
        if (done) {
          stop()
          resolve()
        }
      })
    })
  }

  async function tryInitialLogin() {
    try {
      await refreshToken()
    } catch (err) {
      console.error('Initial token refresh failed', err)
    }
  }

  return {
    authState,
    isLoggedIn,
    accessToken,
    isRefreshing,
    isInitialCheckDone,
    login,
    logout,
    sessionVersion,
    refreshToken,
    waitForInitialCheck,
    tryInitialLogin,
  }
})
