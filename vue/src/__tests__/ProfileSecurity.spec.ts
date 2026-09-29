import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toast } from 'vue-sonner'

const postWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ postWithToken }) }))
const resync = vi.fn(async () => {})
const unsubscribeLocally = vi.fn(async () => {})
vi.mock('@/composables/usePushNotifications', () => ({
  usePushNotifications: () => ({ resync, unsubscribeLocally }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import ProfileSecurity from '@/components/ProfileSecurity.vue'
import { useAuthStore } from '@/stores/auth'

const fill = async (w: ReturnType<typeof mount>, current: string, next: string, repeat: string) => {
  const inputs = w.findAll('input[type="password"]')
  await inputs[0]!.setValue(current)
  await inputs[1]!.setValue(next)
  await inputs[2]!.setValue(repeat)
}

beforeEach(() => {
  setActivePinia(createPinia())
  postWithToken.mockReset()
  resync.mockClear()
  unsubscribeLocally.mockClear()
  vi.mocked(toast.error).mockClear()
})

describe('ProfileSecurity', () => {
  it('blocks submitting when the new passwords differ', async () => {
    const w = mount(ProfileSecurity)
    await fill(w, 'Old!Pass1x', 'Reef#Mask9Zp', 'Reef#Mask9Zq')
    expect(w.find('[data-test="password-mismatch"]').exists()).toBe(true)
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('changes the password, keeps this device signed in and re-registers push', async () => {
    const auth = useAuthStore()
    auth.login('old-token')
    postWithToken.mockResolvedValue({ data: { accessToken: 'new-token' } })
    const w = mount(ProfileSecurity)
    await fill(w, 'Old!Pass1x', 'Reef#Mask9Zp', 'Reef#Mask9Zp')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(postWithToken).toHaveBeenCalledWith(
      '/api/auth/password',
      { currentPassword: 'Old!Pass1x', newPassword: 'Reef#Mask9Zp' },
      { withCredentials: true },
    )
    expect(auth.accessToken).toBe('new-token')
    expect(resync).toHaveBeenCalled()
  })

  it('explains a too-weak password instead of the raw rule codes', async () => {
    postWithToken.mockRejectedValue(
      Object.assign(new Error('400'), {
        isAxiosError: true,
        response: { status: 400, data: { title: 'Invalid password', detail: '[TOO_SHORT]:{...}' } },
      }),
    )
    const w = mount(ProfileSecurity)
    await fill(w, 'Old!Pass1x', 'weakpassword', 'weakpassword')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(vi.mocked(toast.error).mock.calls[0]![0]).toContain('too weak')
    expect(vi.mocked(toast.error).mock.calls[0]![0]).not.toContain('TOO_SHORT')
  })

  it('logs out everywhere after a confirmation step', async () => {
    const auth = useAuthStore()
    auth.login('token')
    postWithToken.mockResolvedValue({ status: 204 })
    const w = mount(ProfileSecurity)

    const first = w.findAll('button').find((b) => b.text() === 'Log out on all devices')!
    await first.trigger('click')
    expect(postWithToken).not.toHaveBeenCalled()
    const confirm = w.findAll('button').find((b) => b.text() === 'Yes, log out everywhere')!
    await confirm.trigger('click')
    await flushPromises()

    expect(postWithToken).toHaveBeenCalledWith('/api/auth/logout-all', undefined, {
      withCredentials: true,
    })
    expect(unsubscribeLocally).toHaveBeenCalled()
    expect(auth.status).toBe('anonymous')
  })
})
