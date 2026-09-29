import { logoutOnServer, refreshAccessToken } from '@/lib/globals/auth/refreshToken'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'
import { useOfflineStore } from '@/stores/offline'
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

/**
 * `offline`: the server can't be reached - the session is kept (cached data stays readable) and a
 * reconnect loop retries. Only a server that answers "no" (`anonymous`) ends a session.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'offline' | 'anonymous'

// Set when logging out without connectivity: the httpOnly refresh cookie can only be cleared by
// the server, so the next start / reconnect finishes the logout before anything else.
export const PENDING_LOGOUT_KEY = 'pending-logout'
const RECONNECT_MIN_MS = 15_000
const RECONNECT_MAX_MS = 120_000

export const useAuthStore = defineStore('auth', () => {
  const offline = useOfflineStore()
  const authState = ref<AuthState>({
    loggedIn: false,
    refreshing: false,
  })
  const status = ref<SessionStatus>('checking')
  const initialCheckDone = ref(false)
  /** Bumped when an offline session reconnects - App.vue remounts the page so it refetches. */
  const reconnectedAt = ref(0)

  let refreshPromise: Promise<string | null> | null = null
  const sessionVersion = ref(0)

  /** A live access token is held (API calls can be made). */
  const isLoggedIn = computed(() => authState.value.loggedIn)
  const isOffline = computed(() => status.value === 'offline')
  /** Show the signed-in app: live, or offline / still checking with this device's cached account. */
  const hasSession = computed(
    () =>
      status.value === 'authenticated' ||
      authState.value.loggedIn ||
      ((status.value === 'offline' || status.value === 'checking') && offline.owner != null),
  )
  const accessToken = computed(() =>
    authState.value.loggedIn ? authState.value.accessToken : null,
  )
  const isRefreshing = computed(() => authState.value.refreshing)
  const isInitialCheckDone = computed(() => initialCheckDone.value)

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = RECONNECT_MIN_MS

  function stopReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
    reconnectDelay = RECONNECT_MIN_MS
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void reconnect()
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
  }

  function enterOffline() {
    status.value = 'offline'
    initialCheckDone.value = true
    scheduleReconnect()
  }

  /** A request got no answer: keep the session (and token), switch to offline mode. */
  function markUnreachable() {
    if (status.value === 'authenticated' || status.value === 'checking') enterOffline()
  }

  function login(token: string) {
    sessionVersion.value++
    refreshPromise = null
    authState.value = {
      loggedIn: true,
      accessToken: token,
      refreshing: false,
    }
    status.value = 'authenticated'
    stopReconnect()
    safeLocalStorage.removeItem(PENDING_LOGOUT_KEY)
    initialCheckDone.value = true
  }

  /** Ends the session on this device and wipes its offline copy (explicit or server-rejected). */
  function logout() {
    sessionVersion.value++
    refreshPromise = null
    authState.value = {
      loggedIn: false,
      refreshing: false,
    }
    status.value = 'anonymous'
    stopReconnect()
    initialCheckDone.value = true
    void offline.clear()
  }

  function markPendingLogout() {
    safeLocalStorage.setItem(PENDING_LOGOUT_KEY, '1')
  }

  /** Finishes an offline logout first; true when one was pending (the session is over then). */
  async function flushPendingLogout(): Promise<boolean> {
    if (safeLocalStorage.getItem(PENDING_LOGOUT_KEY) !== '1') return false
    if (await logoutOnServer()) safeLocalStorage.removeItem(PENDING_LOGOUT_KEY)
    logout()
    return true
  }

  function refreshToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise
    const version = sessionVersion.value
    authState.value = { ...authState.value, refreshing: true }
    const pending = Promise.resolve().then(async () => {
      try {
        const outcome = await refreshAccessToken()
        if (version !== sessionVersion.value) return null
        if (outcome.kind === 'ok') {
          const wasOffline = status.value === 'offline'
          authState.value = { loggedIn: true, accessToken: outcome.token, refreshing: false }
          status.value = 'authenticated'
          stopReconnect()
          if (wasOffline) reconnectedAt.value = Date.now()
          return outcome.token
        }
        if (outcome.kind === 'unauthorized') {
          logout()
        } else {
          enterOffline()
        }
        return null
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

  async function reconnect() {
    if (status.value !== 'offline') return
    if (await flushPendingLogout()) return
    await refreshToken()
  }

  /** The offline banner's "Retry": try right away instead of waiting for the backoff. */
  function retryNow(): Promise<void> {
    stopReconnect()
    return reconnect()
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
      if (await flushPendingLogout()) return
      // Usually already hydrated by main.ts; together so an early API call shares the refresh.
      await Promise.all([offline.hydrate(), refreshToken()])
    } catch (err) {
      console.error('Initial token refresh failed', err)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void reconnect())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reconnect()
    })
  }

  return {
    authState,
    status,
    isLoggedIn,
    isOffline,
    hasSession,
    accessToken,
    isRefreshing,
    isInitialCheckDone,
    reconnectedAt,
    login,
    logout,
    markUnreachable,
    markPendingLogout,
    retryNow,
    sessionVersion,
    refreshToken,
    waitForInitialCheck,
    tryInitialLogin,
  }
})
