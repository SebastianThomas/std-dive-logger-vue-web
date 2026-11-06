<template>
  <section class="space-y-6">
    <h2 class="text-lg font-medium">Account</h2>

    <p v-if="!account" class="text-sm text-gray-600">Loading…</p>

    <template v-else>
      <!-- Username -->
      <div class="space-y-2 max-w-sm">
        <h3 class="text-sm font-medium">Username</h3>
        <div v-if="!editingName" class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="break-all" data-test="account-name">{{ account.name }}</span>
          <button
            v-if="!readOnly"
            type="button"
            class="text-sm text-blue-600 underline"
            data-test="edit-name"
            @click="startEditingName"
          >
            Change
          </button>
        </div>
        <form v-else class="space-y-2" @submit.prevent="saveName">
          <input
            v-model="nameDraft"
            type="text"
            autocomplete="username"
            required
            :maxlength="MAX_NAME_LENGTH"
            aria-label="New username"
            class="w-full rounded border border-gray-300 bg-white px-2 py-1.5"
          />
          <p class="text-xs text-gray-600">
            Shown to buddies and group members. It has to be unique.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="savingName || !nameChanged"
            >
              <i v-if="savingName" class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i>
              Save username
            </button>
            <button type="button" class="px-2 text-sm underline" @click="editingName = false">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Email -->
      <div class="space-y-2 max-w-sm">
        <h3 class="text-sm font-medium">Email</h3>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="break-all" data-test="account-email">{{ account.email }}</span>
          <span
            v-if="account.emailVerified"
            class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
          >
            Verified
          </span>
          <span
            v-else
            class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            data-test="email-unverified"
          >
            Not verified
          </span>
        </div>
        <button
          v-if="!account.emailVerified && !readOnly"
          type="button"
          class="text-sm text-blue-600 underline disabled:opacity-50"
          :disabled="resending"
          @click="resendVerification"
        >
          Send the verification link again
        </button>

        <div
          v-if="account.pendingEmail"
          class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2"
          data-test="pending-email"
        >
          <p>
            Waiting for confirmation of
            <strong class="break-all">{{ account.pendingEmail }}</strong>. Open the link we sent
            there - until then you keep logging in with your current address.
          </p>
          <button
            v-if="!readOnly"
            type="button"
            class="underline disabled:opacity-50"
            :disabled="cancelling"
            @click="cancelEmailChange"
          >
            Cancel this change
          </button>
        </div>

        <button
          v-if="!readOnly && !changingEmail"
          type="button"
          class="text-sm text-blue-600 underline"
          data-test="change-email"
          @click="changingEmail = true"
        >
          {{ account.pendingEmail ? 'Use a different new address' : 'Change email' }}
        </button>

        <form v-if="changingEmail" class="space-y-3" @submit.prevent="requestEmailChange">
          <label class="block text-sm">
            New email
            <input
              v-model="newEmail"
              type="email"
              autocomplete="email"
              required
              class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"
            />
          </label>
          <label class="block text-sm">
            Current password
            <input
              v-model="emailPassword"
              type="password"
              autocomplete="current-password"
              required
              class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"
            />
          </label>
          <p class="text-xs text-gray-600">
            We email a link to the new address. Opening it switches your account over and signs you
            out on every device - then log in with the new address.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="requestingEmail || !newEmail.trim() || !emailPassword"
            >
              <i
                v-if="requestingEmail"
                class="fa-solid fa-spinner fa-spin mr-1"
                aria-hidden="true"
              ></i>
              Send confirmation link
            </button>
            <button type="button" class="px-2 text-sm underline" @click="closeEmailForm">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <p class="text-xs text-gray-600">Member since {{ memberSince }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { type AccountSettings, type User } from '@/lib/types/user'

// Mirrors UserService.MAX_NAME_LENGTH.
const MAX_NAME_LENGTH = 64

defineProps<{ readOnly?: boolean }>()
const emit = defineEmits<{ 'name-changed': [user: User] }>()

const { getWithToken, putWithToken, postWithToken, deleteWithToken } = useApi()

const account = ref<AccountSettings | null>(null)

const editingName = ref(false)
const nameDraft = ref('')
const savingName = ref(false)
const nameChanged = computed(
  () => !!nameDraft.value.trim() && nameDraft.value.trim() !== account.value?.name,
)

const changingEmail = ref(false)
const newEmail = ref('')
const emailPassword = ref('')
const requestingEmail = ref(false)
const cancelling = ref(false)
const resending = ref(false)

const memberSince = computed(() =>
  account.value
    ? new Date(account.value.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '',
)

onMounted(async () => {
  try {
    account.value = (await getWithToken<AccountSettings>('/v1/users/me/account')).data
  } catch (err) {
    toast.error(`Couldn't load your account details: ${extractErrorDetail(err)}`)
  }
})

const startEditingName = () => {
  nameDraft.value = account.value?.name ?? ''
  editingName.value = true
}

const saveName = async () => {
  if (!account.value || !nameChanged.value) return
  savingName.value = true
  try {
    const { data } = await putWithToken<User>('/v1/users/me/name', { name: nameDraft.value.trim() })
    account.value = { ...account.value, name: data.name }
    editingName.value = false
    emit('name-changed', data)
    toast.success('Username changed.')
  } catch (err) {
    toast.error(`Couldn't change the username: ${extractErrorDetail(err)}`)
  } finally {
    savingName.value = false
  }
}

const closeEmailForm = () => {
  changingEmail.value = false
  newEmail.value = emailPassword.value = ''
}

const requestEmailChange = async () => {
  requestingEmail.value = true
  try {
    const { data } = await postWithToken<AccountSettings>('/api/auth/email', {
      newEmail: newEmail.value.trim(),
      currentPassword: emailPassword.value,
    })
    account.value = data
    closeEmailForm()
    toast.success(`Confirmation link sent to ${data.pendingEmail}.`)
  } catch (err) {
    toast.error(`Couldn't change the email: ${extractErrorDetail(err)}`)
  } finally {
    requestingEmail.value = false
  }
}

const cancelEmailChange = async () => {
  cancelling.value = true
  try {
    account.value = (await deleteWithToken<AccountSettings>('/api/auth/email')).data
    toast.success('Email change cancelled.')
  } catch (err) {
    toast.error(`Couldn't cancel the email change: ${extractErrorDetail(err)}`)
  } finally {
    cancelling.value = false
  }
}

const resendVerification = async () => {
  resending.value = true
  try {
    await postWithToken('/api/auth/verify-email/resend')
    toast.success(`Verification link sent to ${account.value?.email}.`)
  } catch (err) {
    toast.error(`Couldn't send the verification link: ${extractErrorDetail(err)}`)
  } finally {
    resending.value = false
  }
}
</script>
