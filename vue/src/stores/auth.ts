import refreshAccessToken from '@/lib/globals/auth/refreshToken'
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

  // Shared in-flight token refresh promise. When several requests need a
  // fresh token at the same time, only the first one should actually trigger
  // a refresh (refresh tokens are typically single-use/rotated); every other
  // concurrent caller awaits this same promise instead of triggering its own
  // redundant refresh. Kept as a plain (non-reactive) variable since it lives
  // only for the lifetime of one refresh call and doesn't need to drive the UI.
  let refreshPromise: Promise<string | null> | null = null

  const isLoggedIn = computed(() => authState.value.loggedIn)
  const accessToken = computed(() =>
    authState.value.loggedIn ? authState.value.accessToken : null,
  )
  const isRefreshing = computed(() => authState.value.refreshing)
  const isInitialCheckDone = computed(() => initialCheckDone.value)

  function login(token: string) {
    authState.value = {
      loggedIn: true,
      accessToken: token,
      refreshing: false,
    }
    initialCheckDone.value = true
  }

  function logout() {
    authState.value = {
      loggedIn: false,
      refreshing: false,
    }
    initialCheckDone.value = true
  }

  function setRefreshing() {
    authState.value = { ...authState.value, refreshing: true }
  }

  /** Returns the currently in-flight refresh promise, if any. */
  function getRefreshPromise(): Promise<string | null> | null {
    return refreshPromise
  }

  /** Registers (or clears, when passed null) the shared in-flight refresh promise. */
  function setRefreshPromise(promise: Promise<string | null> | null) {
    refreshPromise = promise
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
    // Try to login initially by refreshing token (no artificial delay)
    authState.value = { ...authState.value, refreshing: true }
    try {
      const token = await refreshAccessToken()
      if (token) {
        authState.value = { loggedIn: true, accessToken: token, refreshing: false }
      } else {
        authState.value = { loggedIn: false, refreshing: false }
      }
    } catch (err) {
      authState.value = { loggedIn: false, refreshing: false }
      console.error('Initial token refresh failed', err)
    } finally {
      initialCheckDone.value = true
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
    setRefreshing,
    getRefreshPromise,
    setRefreshPromise,
    waitForInitialCheck,
    tryInitialLogin,
  }
})
