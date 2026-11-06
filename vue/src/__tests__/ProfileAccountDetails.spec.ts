import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { toast } from 'vue-sonner'

const getWithToken = vi.fn()
const putWithToken = vi.fn()
const postWithToken = vi.fn()
const deleteWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken, putWithToken, postWithToken, deleteWithToken }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import ProfileAccountDetails from '@/components/ProfileAccountDetails.vue'
import { type AccountSettings } from '@/lib/types/user'

const account = (over: Partial<AccountSettings> = {}): AccountSettings => ({
  id: 7,
  name: 'Reef Diver',
  email: 'reef@test.ch',
  emailVerified: true,
  createdAt: Date.UTC(2025, 0, 15),
  pendingEmail: null,
  ...over,
})

const mountLoaded = async (settings: AccountSettings, readOnly = false) => {
  getWithToken.mockResolvedValue({ data: settings })
  const w = mount(ProfileAccountDetails, { props: { readOnly } })
  await flushPromises()
  return w
}

const button = (w: ReturnType<typeof mount>, text: string) =>
  w.findAll('button').find((b) => b.text() === text)!

beforeEach(() => {
  for (const fn of [getWithToken, putWithToken, postWithToken, deleteWithToken]) fn.mockReset()
  vi.mocked(toast.error).mockClear()
})

describe('ProfileAccountDetails', () => {
  it("shows the account's own name and email", async () => {
    const w = await mountLoaded(account({ emailVerified: false }))
    expect(getWithToken).toHaveBeenCalledWith('/v1/users/me/account')
    expect(w.find('[data-test="account-name"]').text()).toBe('Reef Diver')
    expect(w.find('[data-test="account-email"]').text()).toBe('reef@test.ch')
    expect(w.find('[data-test="email-unverified"]').exists()).toBe(true)
  })

  it('changes the username (trimmed) and tells the page', async () => {
    putWithToken.mockResolvedValue({ data: { id: 7, name: 'Wreck Diver' } })
    const w = await mountLoaded(account())
    await w.find('[data-test="edit-name"]').trigger('click')
    await w.find('input[type="text"]').setValue('  Wreck Diver ')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(putWithToken).toHaveBeenCalledWith('/v1/users/me/name', { name: 'Wreck Diver' })
    expect(w.find('[data-test="account-name"]').text()).toBe('Wreck Diver')
    expect(w.emitted('name-changed')![0]).toEqual([{ id: 7, name: 'Wreck Diver' }])
  })

  it('requests an email change and shows it as pending until confirmed', async () => {
    postWithToken.mockResolvedValue({ data: account({ pendingEmail: 'new@test.ch' }) })
    const w = await mountLoaded(account())
    await w.find('[data-test="change-email"]').trigger('click')
    await w.find('input[type="email"]').setValue(' new@test.ch ')
    await w.find('input[type="password"]').setValue('Dive!Log7Xq')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(postWithToken).toHaveBeenCalledWith('/api/auth/email', {
      newEmail: 'new@test.ch',
      currentPassword: 'Dive!Log7Xq',
    })
    expect(w.find('[data-test="pending-email"]').text()).toContain('new@test.ch')
    expect(w.find('[data-test="account-email"]').text()).toBe('reef@test.ch')
  })

  it('cancels a pending email change', async () => {
    deleteWithToken.mockResolvedValue({ data: account() })
    const w = await mountLoaded(account({ pendingEmail: 'new@test.ch' }))
    await button(w, 'Cancel this change').trigger('click')
    await flushPromises()

    expect(deleteWithToken).toHaveBeenCalledWith('/api/auth/email')
    expect(w.find('[data-test="pending-email"]').exists()).toBe(false)
  })

  it('surfaces the server reason when the change is refused', async () => {
    postWithToken.mockRejectedValue(new Error('The current password is not correct.'))
    const w = await mountLoaded(account())
    await w.find('[data-test="change-email"]').trigger('click')
    await w.find('input[type="email"]').setValue('new@test.ch')
    await w.find('input[type="password"]').setValue('wrong')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(vi.mocked(toast.error).mock.calls[0]![0]).toContain('not correct')
  })

  it('offers no edits in read-only mode', async () => {
    const w = await mountLoaded(account({ emailVerified: false, pendingEmail: 'x@test.ch' }), true)
    expect(w.findAll('button')).toHaveLength(0)
  })
})
