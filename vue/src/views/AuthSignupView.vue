<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full">
      <article>
        <header class="mb-6 text-center">
          <h1 class="text-black text-3xl md:text-4xl font-bold">Create Account</h1>
        </header>

        <form @submit.prevent="handleSubmitSignup" class="space-y-4">
          <div class="flex flex-col">
            <label for="username" class="mb-1 font-medium text-gray-700"> Username </label>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="Enter username"
              required
              class="pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

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
              {{ isLoading ? 'Creating Account...' : 'Sign Up' }}
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
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
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

const handleSubmitSignup = async () => {
  isLoading.value = true
  try {
    const { data } = await axios.post(resolveUrl(`/api/auth/signup`), {
      email: email.value,
      password: password.value,
      name: username.value,
    })
    if (data.id) {
      router.push({ name: 'AuthLogin' })
      return
    }

    throw new Error('Could not sign up')
  } catch (err) {
    console.error(err)
    toast.error(
      'Could not sign up, please check your inputs. You may already be registered with this email address, or the password may be too weak.',
    )
  } finally {
    isLoading.value = false
  }
}
</script>
