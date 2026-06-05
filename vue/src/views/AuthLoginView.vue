<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full">
      <article>
        <header class="mb-6 text-center">
          <h1 class="text-black text-3xl md:text-4xl font-bold">Login</h1>
        </header>
        <form @submit.prevent="handleSubmitLogin" class="space-y-4">
          <div class="flex flex-col">
            <label for="email" class="mb-1 font-medium text-gray-700"> Email </label>
            <input
              id="email"
              v-model="email"
              type="text"
              placeholder="Enter email address"
              required
              class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex flex-col">
            <label for="password" class="mb-1 font-medium text-gray-700"> Password </label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter password"
              required
              class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ isLoading ? 'Logging in...' : 'Login' }}
            </button>
          </div>
        </form>

        <div class="mt-4 text-center">
          <RouterLink :to="{ name: 'AuthMagicLogin' }" class="text-sky-600 hover:underline">
            Use Magic Link Login
          </RouterLink>
        </div>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)

// If already logged in, redirect back to 'from' or home and warn
onMounted(() => {
  const maybeRedirect = () => {
    if (!authStore.isRefreshing && authStore.isLoggedIn) {
      const from = (route.query.from as string) || '/'
      toast.warning('You are already signed in.')
      router.replace(from)
    }
  }
  if (authStore.isRefreshing) {
    const stop = watch(
      () => authStore.isRefreshing,
      (val) => {
        if (!val) {
          stop()
          maybeRedirect()
        }
      },
      { immediate: true },
    )
  } else {
    maybeRedirect()
  }
})

const redirectAfterLogin = () => {
  const from = (route.query.from as string) || '/'
  console.log(`Redirecting to ${from}`)
  router.push(from)
}

const handleSubmitLogin = async () => {
  isLoading.value = true
  try {
    const { data } = await axios.post(
      resolveUrl(`/api/auth/login`),
      { email: email.value, password: password.value },
      { withCredentials: true },
    )
    const { accessToken } = data as { accessToken: string }
    authStore.login(accessToken)
    redirectAfterLogin()
  } catch (err) {
    console.error(err)
    if (axios.isAxiosError(err) && (!err.response || [502, 503, 504].includes(err.response.status))) {
      toast.error('The server is not reachable. Please try again later.')
    } else {
      toast.error('Could not log in, please check your email and password.')
    }
  } finally {
    isLoading.value = false
  }
}
</script>
