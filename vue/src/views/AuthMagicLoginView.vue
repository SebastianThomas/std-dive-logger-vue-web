<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full">
      <article>
        <header class="mb-6 text-center">
          <h1 class="text-black text-3xl md:text-4xl font-bold">Magic Link Login</h1>
        </header>

        <div v-if="isProcessing" class="text-center">
          <p class="text-gray-700">{{ processingMessage }}</p>
        </div>

        <form v-else @submit.prevent="handleSubmitMagicLogin" class="space-y-4">
          <div class="flex flex-col">
            <label for="email" class="mb-1 font-medium text-gray-700"> Email </label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter email address"
              required
              class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex justify-center">
            <button
              type="submit"
              class="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition cursor-pointer"
            >
              Send Magic Link
            </button>
          </div>
        </form>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const isProcessing = ref(false)
const processingMessage = ref('')

const redirectAfterLogin = () => {
  const from = (route.query.from as string) || '/'
  router.push(from)
}

onMounted(async () => {
  // Already logged in? Redirect to 'from' and warn.
  const maybeRedirect = () => {
    if (!authStore.isRefreshing && authStore.isLoggedIn) {
      const from = (route.query.from as string) || '/'
      toast.warning('You are already signed in.')
      router.replace(from)
      return true
    }
    return false
  }
  if (!maybeRedirect()) {
    if (authStore.isRefreshing) {
      const stop = watch(
        () => authStore.isRefreshing,
        (val) => {
          if (!val) {
            stop()
            maybeRedirect()
          }
        },
      )
    }
    const token = route.query.token as string
    if (token) {
      isProcessing.value = true
      processingMessage.value = 'Processing magic link...'
      try {
        const result = await axios.post(
          resolveUrl(`/api/auth/login/magic`),
          { token },
          { withCredentials: true },
        )
        authStore.login(result.data.accessToken)
        redirectAfterLogin()
      } catch (err) {
        console.error(err)
        toast.error('Could not log you in using the given token.')
        isProcessing.value = false
      }
    }
  }
})

const handleSubmitMagicLogin = async () => {
  if (!email.value.trim()) {
    toast.error('Please enter your email address.')
    return
  }

  isProcessing.value = true
  processingMessage.value = 'Sending magic link...'

  try {
    await axios.post(
      resolveUrl(`/api/auth/login/magic/create`),
      { email: email.value },
      {
        withCredentials: true,
      },
    )
    isProcessing.value = false
    processingMessage.value = ''
    toast.success('Check your email for the login link!')
    email.value = ''
  } catch (err) {
    console.error(err)
    isProcessing.value = false
    processingMessage.value = ''
    toast.error(`Could not create a login link for ${email.value}`)
  }
}
</script>
