<template>
  <div
    class="min-h-full flex justify-center items-start pt-4 px-2 sm:px-4 md:pt-20 md:px-6 md:mx-10"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 max-w-2xl w-full">
      <h1 class="text-xl md:text-2xl font-bold mb-4 md:mb-6">Email Verification</h1>

      <div v-if="isLoading" class="text-center py-12">
        <p class="text-gray-600">{{ message }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { extractErrorDetail } from '@/lib/utils/apiErrors'

const router = useRouter()
const route = useRoute()

const isLoading = ref(true)
const message = ref('Verifying your email...')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    toast.error('No verification token provided.')
    router.push({ name: 'Home' })
    return
  }

  try {
    await axios.post(resolveUrl(`/api/auth/verify-email?token=${token}`), {
      withCredentials: true,
    })
    toast.success('Email verified successfully!')
    router.push({ name: 'AuthLogin' })
  } catch (err) {
    console.error(err)
    toast.error(`Could not verify your email: ${extractErrorDetail(err)}`)
    router.push({ name: 'Home' })
  }
})
</script>
