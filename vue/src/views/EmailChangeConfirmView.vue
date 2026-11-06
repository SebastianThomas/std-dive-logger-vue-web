<template>
  <div
    class="min-h-full flex justify-center items-start pt-4 px-2 sm:px-4 md:pt-20 md:px-6 md:mx-10"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 max-w-2xl w-full space-y-4">
      <h1 class="text-xl md:text-2xl font-bold">Confirm new email</h1>
      <p v-if="state === 'confirming'" class="text-gray-600">Confirming your new email address…</p>
      <template v-else-if="state === 'failed'">
        <p class="text-red-600" data-test="confirm-error">{{ error }}</p>
        <router-link :to="{ name: 'Profile' }" class="text-blue-600 underline">
          Back to your account
        </router-link>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { useAuthStore } from '@/stores/auth'

// The link from the email-change mail. No session needed: it may open on another device. The
// server signs the account out everywhere, so this device's session ends too.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const state = ref<'confirming' | 'failed'>('confirming')
const error = ref('')

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    state.value = 'failed'
    error.value = 'This link has no confirmation token.'
    return
  }
  try {
    // withCredentials: the response clears this device's refresh cookie.
    await axios.post(resolveUrl('/api/auth/email/confirm'), { token }, { withCredentials: true })
    if (auth.hasSession) auth.logout()
    toast.success('Email changed - log in with your new address.')
    await router.replace({ name: 'AuthLogin' })
  } catch (err) {
    state.value = 'failed'
    error.value = `Couldn't confirm the new email: ${extractErrorDetail(err)}`
  }
})
</script>
