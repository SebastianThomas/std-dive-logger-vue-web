<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <main class="max-w-5xl w-full mx-auto p-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-8">
        <ProfileTabs :user="user" />

        <!-- Account Section -->
        <section class="space-y-2" v-if="!user">
          <h2 class="text-lg font-medium">Account</h2>
          <p>Loading...</p>
        </section>

        <!-- Danger Zone -->
        <section v-if="!readOnly" class="border-t pt-6 space-y-4">
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
    <DeletionConfirmation
      v-model="showDeregisterModal"
      title="Deregister Account"
      message="Are you sure you want to permanently delete your account? This action cannot be undone."
      confirm-text="Deregister"
      :loading="deregistering"
      @confirm="confirmDeregister"
    />

    <!-- Icon Upload Modal (hidden power-user tool, opened via command palette) -->
    <UserIconUploadModal
      :is-open="showIconUploadModal"
      :current-icon-url="user?.customIconUrl"
      @close="showIconUploadModal = false"
      @updated="handleIconUpdated"
    />

    <!-- Background Upload Modal (hidden power-user tool, opened via command palette) -->
    <UserBackgroundUploadModal
      :is-open="showBackgroundUploadModal"
      :current-background-url="user?.customBackgroundUrl"
      @close="showBackgroundUploadModal = false"
      @updated="handleBackgroundUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { type User } from '@/lib/types/user'
import ProfileTabs from '@/components/ProfileTabs.vue'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import UserIconUploadModal from '@/components/UserIconUploadModal.vue'
import UserBackgroundUploadModal from '@/components/UserBackgroundUploadModal.vue'
import { useUserIconUploadStore } from '@/stores/userIconUpload'
import { useBackgroundUploadStore } from '@/stores/backgroundUpload'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'

const router = useRouter()
const { getWithToken, postWithToken } = useApi()
const { readOnly } = useReadOnlyMode()
const user = ref<User | null>(null)
const showDeregisterModal = ref(false)
const showIconUploadModal = ref(false)
const showBackgroundUploadModal = ref(false)

const userIconUploadStore = useUserIconUploadStore()
const { requestId: iconUploadRequestId } = storeToRefs(userIconUploadStore)
const backgroundUploadStore = useBackgroundUploadStore()
const { requestId: backgroundUploadRequestId } = storeToRefs(backgroundUploadStore)

const handleIconUpdated = (updatedUser: User) => {
  user.value = updatedUser
}

const handleBackgroundUpdated = (updatedUser: User) => {
  user.value = updatedUser
  backgroundUploadStore.notifyUpdated()
}

watch(iconUploadRequestId, () => {
  if (user.value && !readOnly.value) {
    showIconUploadModal.value = true
  }
})

watch(backgroundUploadRequestId, () => {
  if (user.value && !readOnly.value) {
    showBackgroundUploadModal.value = true
  }
})

onMounted(async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    user.value = res.data
  } catch (err) {
    console.error(err)
    toast.error(`Failed to load user profile: ${extractErrorDetail(err)}`)
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
  if (
    event.key.toLowerCase() === 'd' &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !readOnly.value
  ) {
    showDeregisterModal.value = true
  }
}

const deregistering = ref(false)

const confirmDeregister = async () => {
  if (deregistering.value) return
  deregistering.value = true
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
    toast.error(`Failed to deregister account: ${extractErrorDetail(err)}`)
  } finally {
    deregistering.value = false
  }
}
</script>
