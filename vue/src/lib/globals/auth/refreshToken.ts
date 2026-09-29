import axios from 'axios'
import { resolveUrl } from '../url/resolveUrl'

/**
 * `unauthorized` means the server rejected the session (logged out, revoked, expired);
 * `unreachable` means no usable answer at all (offline, timeout, 5xx, a captive portal's HTML) -
 * the session may still be fine, so the caller must not log out on it.
 */
export type RefreshOutcome =
  | { kind: 'ok'; token: string }
  | { kind: 'unauthorized' }
  | { kind: 'unreachable' }

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/
// Generous: a slow boat/hotel connection must not look like a rejected session.
const REFRESH_TIMEOUT_MS = 8000

/** Calls the refresh endpoint, which reads the httpOnly refresh cookie and returns a raw JWT. */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { kind: 'unreachable' }
  }
  try {
    const res = await axios.post(resolveUrl('/api/auth/refresh'), undefined, {
      withCredentials: true,
      timeout: REFRESH_TIMEOUT_MS,
    })
    const token = typeof res.data === 'string' ? res.data.trim() : ''
    return JWT_SHAPE.test(token) ? { kind: 'ok', token } : { kind: 'unreachable' }
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    if (status === 400 || status === 401 || status === 403) return { kind: 'unauthorized' }
    return { kind: 'unreachable' }
  }
}

/** Server-side logout (drops the refresh token + clears the cookie). False when unreachable. */
export async function logoutOnServer(timeout = 10000): Promise<boolean> {
  try {
    await axios.post(resolveUrl('/api/auth/logout'), undefined, { withCredentials: true, timeout })
    return true
  } catch (err) {
    return axios.isAxiosError(err) && !!err.response && err.response.status < 500
  }
}
