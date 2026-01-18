<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="max-w-5xl w-full mx-auto p-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-8">
        <!-- Header -->
        <div class="flex items-center gap-6">
          <!-- Profile Picture Placeholder -->
          <div
            class="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-semibold"
          >
            {{ user?.name?.charAt(0).toUpperCase() ?? '?' }}
          </div>

          <!-- User Info -->
          <div>
            <h1 class="text-2xl font-semibold">User Profile</h1>
            <p v-if="user" class="text-gray-700 dark:text-gray-300 mt-1">
              <strong>Username:</strong> {{ user.name }}
            </p>
          </div>
        </div>

        <!-- Account Section -->
        <section class="space-y-2" v-if="!user">
          <h2 class="text-lg font-medium">Account</h2>
          <p>Loading...</p>
        </section>

        <!-- Configurations Section -->
        <section v-if="user" class="border-t pt-6 space-y-4">
          <h2 class="text-lg font-medium">Equipment Configurations</h2>
          <SuitManagement :user-id="user.id" />
        </section>

        <!-- Danger Zone -->
        <section class="border-t pt-6 space-y-4">
          <h2 class="text-lg font-medium text-red-600">Permanently Delete Account</h2>

          <button
            @click="showDeregisterModal = true"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete Account
          </button>
        </section>
      </div>
    </main>

    <!-- Deregister Modal -->
    <div
      v-if="showDeregisterModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 class="text-lg font-semibold text-red-600">Deregister Account</h3>

        <p class="text-gray-700">
          Are you sure you want to permanently delete your account? This action cannot be undone.
        </p>

        <div class="flex justify-end gap-3">
          <button @click="showDeregisterModal = false" class="px-4 py-2 rounded border">
            Cancel
          </button>

          <button
            @click="confirmDeregister"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Deregister
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { type User } from '@/lib/types/user'
import SuitManagement from '@/components/dive/SuitManagement.vue'

const router = useRouter()
const { getWithToken, postWithToken } = useApi()
const user = ref<{ id: number; name: string } | null>(null)
const showDeregisterModal = ref(false)

onMounted(async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    user.value = res.data
  } catch (err) {
    console.error(err)
    toast.error('Failed to load user profile')
  }
  window.addEventListener('keydown', handleProfileKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleProfileKeydown)
})

// Keyboard shortcuts for ProfileView
const handleProfileKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return
  }

  // Shift+D to delete account
  if (event.key.toLowerCase() === 'd' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
    showDeregisterModal.value = true
  }
}

const confirmDeregister = async () => {
  try {
    const res = await postWithToken('/api/auth/deregister')

    if (res.status !== 200) {
      throw new Error('Deregistration failed')
    }

    localStorage.removeItem('token')
    toast.success('Account deregistered successfully')
    router.push({ name: 'AuthSignup' })
  } catch (err) {
    console.error(err)
    toast.error('Failed to deregister account')
  }
}
</script>
