<template>
  <section class="border-t pt-6 space-y-6">
    <h2 class="text-lg font-medium">Security</h2>

    <form class="space-y-3 max-w-sm" @submit.prevent="changePassword">
      <h3 class="text-sm font-medium">Change password</h3>
      <label class="block text-sm">
        Current password
        <input
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          required
          class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"
        />
      </label>
      <label class="block text-sm">
        New password
        <input
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
          class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"
        />
      </label>
      <label class="block text-sm">
        Repeat new password
        <input
          v-model="repeatPassword"
          type="password"
          autocomplete="new-password"
          required
          class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"
        />
      </label>
      <p v-if="mismatch" class="text-xs text-red-600" data-test="password-mismatch">
        The new passwords don't match.
      </p>
      <p class="text-xs text-gray-600">{{ POLICY }} Changing it signs you out on all other devices.</p>
      <button
        type="submit"
        class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="changing || !canSubmit"
      >
        <i v-if="changing" class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i>
        Change password
      </button>
    </form>

    <div class="space-y-2">
      <h3 class="text-sm font-medium">Other devices</h3>
      <p class="text-xs text-gray-600">
        Signs this account out everywhere - including here - and stops its notifications on every
        device. Use it if a phone or laptop went missing.
      </p>
      <button
        v-if="!confirmingLogoutAll"
        type="button"
        class="rounded-lg border border-red-500 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        @click="confirmingLogoutAll = true"
      >
        Log out on all devices
      </button>
      <div v-else class="flex flex-wrap items-center gap-2 text-sm">
        <span>Sign out everywhere?</span>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          :disabled="loggingOutAll"
          @click="logoutEverywhere"
        >
          Yes, log out everywhere
        </button>
        <button type="button" class="underline" @click="confirmingLogoutAll = false">Cancel</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import axios from 'axios'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { useAuthStore } from '@/stores/auth'

// Mirrors the backend's signup/change policy (UserService's passay rules).
const POLICY =
  'At least 8 characters with upper- and lower-case letters, a digit and a special character, and no runs like "abcd" or "1234".'

const { postWithToken } = useApi()
const auth = useAuthStore()
const push = usePushNotifications()

const currentPassword = ref('')
const newPassword = ref('')
const repeatPassword = ref('')
const changing = ref(false)
const confirmingLogoutAll = ref(false)
const loggingOutAll = ref(false)

const mismatch = computed(() => !!repeatPassword.value && newPassword.value !== repeatPassword.value)
const canSubmit = computed(
  () => !!currentPassword.value && newPassword.value.length >= 8 && !mismatch.value && !!repeatPassword.value,
)

const describe = (err: unknown): string =>
  axios.isAxiosError(err) && (err.response?.data as { title?: string })?.title === 'Invalid password'
    ? `The new password is too weak. ${POLICY}`
    : extractErrorDetail(err)

const changePassword = async () => {
  if (!canSubmit.value) return
  changing.value = true
  try {
    // withCredentials: the response sets this device's new refresh cookie.
    const { data } = await postWithToken<{ accessToken: string }>(
      '/api/auth/password',
      { currentPassword: currentPassword.value, newPassword: newPassword.value },
      { withCredentials: true },
    )
    auth.login(data.accessToken)
    void push.resync()
    currentPassword.value = newPassword.value = repeatPassword.value = ''
    toast.success('Password changed - your other devices are signed out.')
  } catch (err) {
    toast.error(`Couldn't change the password: ${describe(err)}`)
  } finally {
    changing.value = false
  }
}

const logoutEverywhere = async () => {
  loggingOutAll.value = true
  try {
    await postWithToken('/api/auth/logout-all', undefined, { withCredentials: true })
    await push.unsubscribeLocally()
    toast.success('Signed out on all devices.')
    auth.logout()
  } catch (err) {
    toast.error(`Couldn't sign out everywhere: ${extractErrorDetail(err)}`)
  } finally {
    loggingOutAll.value = false
    confirmingLogoutAll.value = false
  }
}
</script>
