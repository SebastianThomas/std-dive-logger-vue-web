import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { refreshAccessToken } from '@/lib/globals/auth/refreshToken'

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return { ...actual, default: Object.assign({}, actual.default, { post: vi.fn() }) }
})
const post = vi.mocked(axios.post)

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl'
const httpError = (status?: number) =>
  Object.assign(new Error('failed'), {
    isAxiosError: true,
    response: status == null ? undefined : { status },
  })

afterEach(() => {
  post.mockReset()
  vi.unstubAllGlobals()
})

describe('refreshAccessToken', () => {
  it('returns the token for a JWT-shaped 200', async () => {
    post.mockResolvedValue({ data: JWT })
    await expect(refreshAccessToken()).resolves.toEqual({ kind: 'ok', token: JWT })
  })

  it.each([400, 401, 403])('treats %i as a rejected session', async (status) => {
    post.mockRejectedValue(httpError(status))
    await expect(refreshAccessToken()).resolves.toEqual({ kind: 'unauthorized' })
  })

  it.each([
    ['a network error', httpError()],
    ['a 500', httpError(500)],
    ['a 503', httpError(503)],
    ['a timeout', Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })],
  ])('treats %s as unreachable, never as logged out', async (_label, error) => {
    post.mockRejectedValue(error)
    await expect(refreshAccessToken()).resolves.toEqual({ kind: 'unreachable' })
  })

  it("treats a captive portal's HTML 200 as unreachable", async () => {
    post.mockResolvedValue({ data: '<html><body>Hotel Wi-Fi login</body></html>' })
    await expect(refreshAccessToken()).resolves.toEqual({ kind: 'unreachable' })
  })

  it('does not even try while the browser reports no network', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(refreshAccessToken()).resolves.toEqual({ kind: 'unreachable' })
    expect(post).not.toHaveBeenCalled()
  })
})
