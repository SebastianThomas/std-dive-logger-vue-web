<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white rounded-2xl p-6 max-w-2xl w-full">
      <h1 class="text-2xl font-bold mb-6">Email Verification</h1>

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
    toast.error('Could not verify your email. The link may have expired.')
    router.push({ name: 'Home' })
  }
})
</script>
