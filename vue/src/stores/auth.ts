import refreshAccessToken from '@/lib/globals/auth/refreshToken'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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

  const isLoggedIn = computed(() => authState.value.loggedIn)
  const accessToken = computed(() =>
    authState.value.loggedIn ? authState.value.accessToken : null,
  )
  const isRefreshing = computed(() => authState.value.refreshing)

  function login(token: string) {
    authState.value = {
      loggedIn: true,
      accessToken: token,
      refreshing: false,
    }
  }

  function logout() {
    authState.value = {
      loggedIn: false,
      refreshing: false,
    }
  }

  function setRefreshing() {
    authState.value = { ...authState.value, refreshing: true }
  }

  async function tryInitialLogin() {
    // Try to login initially by refreshing token (no artificial delay)
    authState.value = { loggedIn: false, refreshing: true }
    const token = await refreshAccessToken()
    if (token) {
      authState.value = { loggedIn: true, accessToken: token, refreshing: false }
    } else {
      authState.value = { loggedIn: false, refreshing: false }
    }
  }

  return {
    authState,
    isLoggedIn,
    accessToken,
    isRefreshing,
    login,
    logout,
    setRefreshing,
    tryInitialLogin,
  }
})
